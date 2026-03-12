package com.whennawa.dto.board;

import java.util.List;

public class BoardPageResponse<T> {
    private final List<T> items;
    private final int page;
    private final int size;
    private final boolean hasNext;
    private final int totalPages;
    private final long totalElements;

    public BoardPageResponse(List<T> items, int page, int size, boolean hasNext) {
        this(items, page, size, hasNext, -1, -1L);
    }

    public BoardPageResponse(List<T> items, int page, int size, boolean hasNext, int totalPages, long totalElements) {
        this.items = items;
        this.page = page;
        this.size = size;
        this.hasNext = hasNext;
        this.totalPages = totalPages;
        this.totalElements = totalElements;
    }

    public List<T> getItems() {
        return items;
    }

    public int getPage() {
        return page;
    }

    public int getSize() {
        return size;
    }

    public boolean isHasNext() {
        return hasNext;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public long getTotalElements() {
        return totalElements;
    }
}
