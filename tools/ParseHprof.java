import java.io.*;
import java.util.*;
import java.util.stream.*;

/**
 * Minimal HPROF binary parser that extracts a class histogram from a Java heap dump.
 * Produces a report showing top memory consumers by shallow size, with separate
 * sections for application-specific (com.entero) and Hibernate/ORM classes.
 *
 * Usage: java ParseHprof <path-to-hprof-file>
 *
 * Supports HPROF format 1.0.2 with 4-byte or 8-byte identifiers.
 */
public class ParseHprof {

    static final int HPROF_UTF8 = 0x01;
    static final int HPROF_LOAD_CLASS = 0x02;
    static final int HPROF_HEAP_DUMP = 0x0C;
    static final int HPROF_HEAP_DUMP_SEGMENT = 0x1C;

    static final int GC_ROOT_UNKNOWN = 0xFF;
    static final int GC_ROOT_JNI_GLOBAL = 0x01;
    static final int GC_ROOT_JNI_LOCAL = 0x02;
    static final int GC_ROOT_JAVA_FRAME = 0x03;
    static final int GC_ROOT_NATIVE_STACK = 0x04;
    static final int GC_ROOT_STICKY_CLASS = 0x05;
    static final int GC_ROOT_THREAD_BLOCK = 0x06;
    static final int GC_ROOT_MONITOR_USED = 0x07;
    static final int GC_ROOT_THREAD_OBJ = 0x08;
    static final int GC_CLASS_DUMP = 0x20;
    static final int GC_INSTANCE_DUMP = 0x21;
    static final int GC_OBJ_ARRAY_DUMP = 0x22;
    static final int GC_PRIM_ARRAY_DUMP = 0x23;

    static final Map<Integer, Integer> BASIC_TYPE_SIZES = Map.of(
        4, 1, 5, 2, 6, 4, 7, 8, 8, 1, 9, 2, 10, 4, 11, 8
    );
    static final Map<Integer, String> PRIM_TYPE_NAMES = Map.of(
        4, "boolean[]", 5, "char[]", 6, "float[]", 7, "double[]",
        8, "byte[]", 9, "short[]", 10, "int[]", 11, "long[]"
    );

    static int idSize;
    static Map<Long, String> strings = new HashMap<>();
    static Map<Long, String> classObjToName = new HashMap<>();

    static Map<Long, long[]> instanceStats = new HashMap<>();
    static Map<String, long[]> arrayStats = new HashMap<>();

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            System.err.println("Usage: java ParseHprof <path-to-hprof-file>");
            System.exit(1);
        }
        String filepath = args[0];
        long fileSize = new File(filepath).length();
        System.out.printf("Parsing: %s%n", filepath);
        System.out.printf("File size: %,d bytes (%.1f GB)%n", fileSize, fileSize / 1024.0 / 1024.0 / 1024.0);

        try (DataInputStream dis = new DataInputStream(new BufferedInputStream(new FileInputStream(filepath), 8 * 1024 * 1024))) {
            StringBuilder header = new StringBuilder();
            int b;
            while ((b = dis.read()) != 0 && b != -1) {
                header.append((char) b);
            }
            System.out.println("Format: " + header);

            idSize = dis.readInt();
            dis.readLong(); // timestamp
            System.out.println("ID size: " + idSize + " bytes");

            long totalRecords = 0;
            int heapSegments = 0;
            long bytesRead = header.length() + 1 + 4 + 8;

            while (true) {
                int tag;
                try {
                    tag = dis.readUnsignedByte();
                } catch (EOFException e) {
                    break;
                }
                dis.readInt(); // time offset
                int length = dis.readInt();
                bytesRead += 9;
                totalRecords++;

                if (totalRecords % 50000 == 0) {
                    System.err.printf("\r  Progress: %.1f%% (%,d records)   ",
                        (bytesRead * 100.0) / fileSize, totalRecords);
                }

                switch (tag) {
                    case HPROF_UTF8: {
                        long strId = readId(dis);
                        byte[] strBytes = new byte[length - idSize];
                        dis.readFully(strBytes);
                        strings.put(strId, new String(strBytes, "UTF-8"));
                        bytesRead += length;
                        break;
                    }
                    case HPROF_LOAD_CLASS: {
                        int serial = dis.readInt();
                        long objId = readId(dis);
                        dis.readInt(); // stack serial
                        long nameId = readId(dis);
                        String name = strings.get(nameId);
                        if (name != null) {
                            classObjToName.put(objId, name.replace('/', '.'));
                        }
                        bytesRead += length;
                        break;
                    }
                    case HPROF_HEAP_DUMP:
                    case HPROF_HEAP_DUMP_SEGMENT: {
                        heapSegments++;
                        long remaining = length;
                        while (remaining > 0) {
                            int subTag = dis.readUnsignedByte();
                            remaining--;
                            remaining -= parseHeapSubRecord(dis, subTag);
                        }
                        bytesRead += length;
                        break;
                    }
                    default: {
                        long toSkip = length;
                        while (toSkip > 0) toSkip -= dis.skip(toSkip);
                        bytesRead += length;
                        break;
                    }
                }
            }

            System.err.println();
            System.out.printf("%nTotal records: %,d%n", totalRecords);
            System.out.printf("Heap segments: %d%n", heapSegments);
            System.out.printf("Classes loaded: %,d%n", classObjToName.size());

            printHistogram();
        }
    }

    static long readId(DataInputStream dis) throws IOException {
        if (idSize == 4) return Integer.toUnsignedLong(dis.readInt());
        return dis.readLong();
    }

    static void skipBytes(DataInputStream dis, long count) throws IOException {
        long remaining = count;
        while (remaining > 0) {
            long skipped = dis.skip(remaining);
            if (skipped > 0) {
                remaining -= skipped;
            } else {
                dis.readByte();
                remaining--;
            }
        }
    }

    static long parseHeapSubRecord(DataInputStream dis, int subTag) throws IOException {
        long consumed = 0;
        switch (subTag) {
            case GC_ROOT_UNKNOWN:
                skipBytes(dis, idSize);
                consumed = idSize;
                break;
            case GC_ROOT_JNI_GLOBAL:
                skipBytes(dis, idSize * 2);
                consumed = idSize * 2;
                break;
            case GC_ROOT_JNI_LOCAL:
            case GC_ROOT_JAVA_FRAME:
                skipBytes(dis, idSize + 8);
                consumed = idSize + 8;
                break;
            case GC_ROOT_NATIVE_STACK:
                skipBytes(dis, idSize + 4);
                consumed = idSize + 4;
                break;
            case GC_ROOT_STICKY_CLASS:
                skipBytes(dis, idSize);
                consumed = idSize;
                break;
            case GC_ROOT_THREAD_BLOCK:
                skipBytes(dis, idSize + 4);
                consumed = idSize + 4;
                break;
            case GC_ROOT_MONITOR_USED:
                skipBytes(dis, idSize);
                consumed = idSize;
                break;
            case GC_ROOT_THREAD_OBJ:
                skipBytes(dis, idSize + 8);
                consumed = idSize + 8;
                break;
            case GC_CLASS_DUMP: {
                readId(dis); // class id
                dis.readInt(); // stack serial
                readId(dis); // super
                skipBytes(dis, idSize * 5); // loader, signers, protDomain, reserved1, reserved2
                dis.readInt(); // instance size
                consumed = idSize + 4 + idSize * 6 + 4;

                int cpCount = dis.readUnsignedShort();
                consumed += 2;
                for (int i = 0; i < cpCount; i++) {
                    skipBytes(dis, 2);
                    int ty = dis.readUnsignedByte();
                    consumed += 3;
                    int sz = (ty == 2) ? idSize : BASIC_TYPE_SIZES.getOrDefault(ty, 0);
                    skipBytes(dis, sz);
                    consumed += sz;
                }

                int sfCount = dis.readUnsignedShort();
                consumed += 2;
                for (int i = 0; i < sfCount; i++) {
                    skipBytes(dis, idSize);
                    int ty = dis.readUnsignedByte();
                    consumed += idSize + 1;
                    int sz = (ty == 2) ? idSize : BASIC_TYPE_SIZES.getOrDefault(ty, 0);
                    skipBytes(dis, sz);
                    consumed += sz;
                }

                int ifCount = dis.readUnsignedShort();
                consumed += 2;
                skipBytes(dis, (long) ifCount * (idSize + 1));
                consumed += (long) ifCount * (idSize + 1);
                break;
            }
            case GC_INSTANCE_DUMP: {
                readId(dis); // obj id
                dis.readInt(); // stack serial
                long classId = readId(dis);
                int dataLen = dis.readInt();
                skipBytes(dis, dataLen);
                consumed = idSize + 4 + idSize + 4 + dataLen;

                instanceStats.computeIfAbsent(classId, k -> new long[2]);
                instanceStats.get(classId)[0]++;
                instanceStats.get(classId)[1] += dataLen + 16;
                break;
            }
            case GC_OBJ_ARRAY_DUMP: {
                readId(dis); // obj id
                dis.readInt(); // stack serial
                int numElements = dis.readInt();
                long arrayClassId = readId(dis);
                skipBytes(dis, (long) idSize * numElements);
                consumed = idSize + 4 + 4 + idSize + (long) idSize * numElements;

                String name = classObjToName.getOrDefault(arrayClassId, "unknown[]");
                arrayStats.computeIfAbsent(name, k -> new long[2]);
                arrayStats.get(name)[0]++;
                arrayStats.get(name)[1] += (long) idSize * numElements + 16;
                break;
            }
            case GC_PRIM_ARRAY_DUMP: {
                readId(dis); // obj id
                dis.readInt(); // stack serial
                int numElements = dis.readInt();
                int elemType = dis.readUnsignedByte();
                int elemSize = BASIC_TYPE_SIZES.getOrDefault(elemType, 0);
                long dataLen = (long) numElements * elemSize;
                skipBytes(dis, dataLen);
                consumed = idSize + 4 + 4 + 1 + dataLen;

                String typeName = PRIM_TYPE_NAMES.getOrDefault(elemType, "prim[]");
                arrayStats.computeIfAbsent(typeName, k -> new long[2]);
                arrayStats.get(typeName)[0]++;
                arrayStats.get(typeName)[1] += dataLen + 16;
                break;
            }
            default:
                throw new IOException("Unknown heap sub-tag: 0x" + Integer.toHexString(subTag));
        }
        return consumed;
    }

    static void printHistogram() {
        Map<String, long[]> combined = new TreeMap<>();

        for (var entry : instanceStats.entrySet()) {
            String name = classObjToName.getOrDefault(entry.getKey(), "unknown_0x" + Long.toHexString(entry.getKey()));
            combined.merge(name, entry.getValue().clone(), (a, b2) -> { a[0] += b2[0]; a[1] += b2[1]; return a; });
        }
        for (var entry : arrayStats.entrySet()) {
            combined.merge(entry.getKey(), entry.getValue().clone(), (a, b2) -> { a[0] += b2[0]; a[1] += b2[1]; return a; });
        }

        long totalSize = combined.values().stream().mapToLong(v -> v[1]).sum();
        long totalCount = combined.values().stream().mapToLong(v -> v[0]).sum();

        var sorted = combined.entrySet().stream()
            .sorted((a, b2) -> Long.compare(b2.getValue()[1], a.getValue()[1]))
            .collect(Collectors.toList());

        System.out.println();
        System.out.println("=".repeat(100));
        System.out.println("HEAP HISTOGRAM - TOP 60 CLASSES BY SHALLOW SIZE");
        System.out.println("=".repeat(100));
        System.out.printf("%-4s %15s %18s %10s %6s  %s%n", "#", "Count", "Size (bytes)", "Size (MB)", "%", "Class Name");
        System.out.println("-".repeat(100));

        int rank = 0;
        for (var entry : sorted) {
            rank++;
            if (rank > 60) break;
            long count = entry.getValue()[0];
            long size = entry.getValue()[1];
            double pct = totalSize > 0 ? (size * 100.0 / totalSize) : 0;
            System.out.printf("%-4d %,15d %,18d %9.1f %5.1f%%  %s%n", rank, count, size, size / 1024.0 / 1024.0, pct, entry.getKey());
        }

        System.out.println("-".repeat(100));
        System.out.printf("     %,15d %,18d %9.1f        TOTAL%n", totalCount, totalSize, totalSize / 1024.0 / 1024.0);
        System.out.println("=".repeat(100));

        printFilteredSection("APPLICATION-SPECIFIC CLASSES (com.entero.*)", sorted, totalSize,
            name -> name.contains("entero"), 30);

        printFilteredSection("HIBERNATE/ORM CLASSES", sorted, totalSize,
            name -> name.contains("hibernate") || name.contains("Hibernate"), 20);

        printFilteredSection("COLLECTION / INFRASTRUCTURE CLASSES", sorted, totalSize,
            name -> name.startsWith("java.util.") || name.startsWith("[Ljava.util."), 20);
    }

    static void printFilteredSection(String title, List<Map.Entry<String, long[]>> sorted, long totalSize,
                                     java.util.function.Predicate<String> filter, int limit) {
        System.out.println();
        System.out.println("=".repeat(100));
        System.out.println(title);
        System.out.println("=".repeat(100));
        System.out.printf("%-4s %15s %18s %10s %6s  %s%n", "#", "Count", "Size (bytes)", "Size (MB)", "%", "Class Name");
        System.out.println("-".repeat(100));

        int rank = 0;
        for (var entry : sorted) {
            if (!filter.test(entry.getKey())) continue;
            rank++;
            if (rank > limit) break;
            long count = entry.getValue()[0];
            long size = entry.getValue()[1];
            double pct = totalSize > 0 ? (size * 100.0 / totalSize) : 0;
            System.out.printf("%-4d %,15d %,18d %9.1f %5.1f%%  %s%n", rank, count, size, size / 1024.0 / 1024.0, pct, entry.getKey());
        }
        System.out.println("=".repeat(100));
    }
}
