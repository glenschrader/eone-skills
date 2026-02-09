---
name: analyze-heapdump
description: This skill should be used when the user asks to "analyze a heap dump", "examine hprof", "diagnose OOM", "check heap dump", "what caused the OutOfMemoryError", "memory leak analysis", "parse hprof file", or mentions examining a .hprof file for memory issues. Parses Java HPROF binary heap dumps and produces class histograms to identify memory leak root causes.
---

# Analyze Java Heap Dump (HPROF)

This skill analyzes Java heap dump files (.hprof) to diagnose OutOfMemoryError and identify memory leaks.

## When to Use

- User has a `.hprof` heap dump file and wants to know what caused an OOM
- User wants to identify the top memory consumers in a heap dump
- User needs to diagnose a memory leak from a heap dump
- User mentions `java_pid*.hprof` files or `-XX:+HeapDumpOnOutOfMemoryError` output

## Workflow

### Step 1: Locate the Heap Dump File

Ask the user for the path to the `.hprof` file if not provided. Check that the file exists and note its size.

### Step 2: Identify the OOM Type

Search the binary file for OOM error type strings to quickly identify the failure mode:

```bash
grep -aoP "Java heap space|GC overhead limit exceeded|Metaspace|Direct buffer memory|unable to create native thread|Compressed class space" "<hprof-file>" | sort | uniq -c | sort -rn
```

Also search for JVM heap settings:

```bash
grep -aoP "\-Xmx[0-9]+[mgMG]|\-Xms[0-9]+[mgMG]" "<hprof-file>" | sort | uniq -c | sort -rn | head -10
```

And identify the process type:

```bash
grep -aoP "org\.gradle|GradleWorker|TestExecutor|com\.entero|org\.apache\.tomcat|org\.springframework" "<hprof-file>" | sort | uniq -c | sort -rn | head -20
```

### Step 3: Compile and Run the HPROF Parser

The plugin includes a Java-based HPROF binary parser at `${CLAUDE_PLUGIN_ROOT}/tools/ParseHprof.java`. Find the Java compiler using the project's JDK or the system JDK.

**Compile:**
```bash
javac "${CLAUDE_PLUGIN_ROOT}/tools/ParseHprof.java"
```

**Run** (allocate ~1GB for the parser itself; adjust if the dump is very large):
```bash
java -Xmx1g -cp "${CLAUDE_PLUGIN_ROOT}/tools" ParseHprof "<hprof-file>"
```

The parser outputs:
1. **File metadata** - format version, ID size, total records, class count
2. **Top 60 classes by shallow size** - the full histogram
3. **Application-specific classes (com.entero.\*)** - top 30 domain objects
4. **Hibernate/ORM classes** - top 20 Hibernate infrastructure objects
5. **Collection/infrastructure classes** - top 20 java.util.* objects

The parser may take several minutes for multi-GB dumps. Progress is printed to stderr.

### Step 4: Analyze the Results

Use the histogram output to identify the root cause. Look for these common patterns:

#### Pattern: Hibernate Session Leak
- **Symptoms**: Large counts of `SessionImpl`, `StatefulPersistenceContext`, `MutableEntityEntry`, `EntityKey`, `PersistentSet`
- **Root cause**: Sessions opened but not closed, or held in caches/maps preventing GC
- **Investigation**: Search for `openSession()`, `getCurrentSession()`, session factories, and `WeakHashMap` patterns where values reference keys

#### Pattern: Unbounded Collection Growth
- **Symptoms**: Millions of `HashMap$Node`, `ArrayList`, `LinkedList$Node`
- **Root cause**: Collections growing without bounds in caches, listeners, or static fields
- **Investigation**: Look at what domain objects populate those collections

#### Pattern: Large Result Sets
- **Symptoms**: Hundreds of thousands of a single domain entity (e.g., `PriceDetail`, `Transaction`)
- **Root cause**: Queries without pagination loading entire tables into memory
- **Investigation**: Search for JPA/Hibernate queries fetching the entity type without `LIMIT`/`setMaxResults()`

#### Pattern: String/byte[] Accumulation
- **Symptoms**: `byte[]` and `String` dominating the histogram
- **Root cause**: Large responses, log buffers, or serialization buffers accumulating
- **Investigation**: Check what objects reference the large arrays

#### Pattern: ClassLoader Leak
- **Symptoms**: Duplicate classes, large `Metaspace` usage
- **Root cause**: ClassLoaders not being garbage collected (common in hot-deploy scenarios)
- **Investigation**: Look for custom classloaders and static references preventing GC

### Step 5: Correlate with Codebase

Once the top memory consumers are identified:

1. **Map class names to source files** - Use Grep/Glob to find the source for the top classes
2. **Find creation patterns** - Search for `new ClassName()` or factory methods
3. **Identify accumulation points** - Look for static fields, caches, maps, or listeners that hold references
4. **Check lifecycle management** - Verify objects are properly closed/released (especially Sessions, Connections, Streams)
5. **Look for circular references in WeakHashMaps** - A common leak pattern where the value strongly references the key

### Step 6: Report Findings

Present the analysis as:
1. **OOM type and heap size** - What failed and how much memory was available
2. **Process identification** - What JVM process produced the dump
3. **Top memory consumers** - Table of the biggest classes by count and size
4. **Root cause** - The specific code pattern causing the leak
5. **Affected files** - File paths and line numbers
6. **Recommended fix** - Specific code changes to resolve the issue

## Important Notes

- The parser only computes **shallow size** (direct object size), not retained size (object + everything it references). Use shallow size to identify which classes have the most instances, then reason about retained size based on reference chains.
- For very large dumps (>4GB), increase the parser's `-Xmx` accordingly.
- The parser requires Java 17+ (for `Map.of()`, text blocks, pattern matching).
- If the parser hits an unknown heap sub-tag, it will fail. This is rare but can happen with corrupted dumps.

## Error Handling

**Parser compilation fails:** Ensure Java 17+ is available. Check `JAVA_HOME` or find the JDK with `where javac` / `ls ~/.jdks/`.

**Parser runs out of memory:** Increase `-Xmx` for the parser. As a rule of thumb, the parser needs ~30-40% of the dump file size.

**Corrupted dump:** If the parser throws "Unknown heap sub-tag", the dump may be truncated or corrupted. Fall back to the grep-based analysis from Step 2 for partial information.
