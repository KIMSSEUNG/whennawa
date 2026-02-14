package com.whennawa.util;

import java.nio.ByteBuffer;
import java.util.UUID;

public final class UUIDBinaryConverter {

    private UUIDBinaryConverter() {
    }


    public static byte[] uuidToBytes(UUID uuid) {
        ByteBuffer buffer = ByteBuffer.allocate(16);
        buffer.putLong(uuid.getMostSignificantBits());
        buffer.putLong(uuid.getLeastSignificantBits());
        return buffer.array();
    }

    public static UUID bytesToUuid(byte[] bytes) {
        ByteBuffer buffer = ByteBuffer.wrap(bytes);
        long most = buffer.getLong();
        long least = buffer.getLong();
        return new UUID(most, least);
    }
}




