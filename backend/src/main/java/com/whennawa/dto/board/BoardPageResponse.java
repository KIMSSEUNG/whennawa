package com.whennawa.dto.board;

import java.util.List;

public class BoardPageResponse<T> {
    private final List<T> items;
    private final int page;
    private final int size;
    private final boolean hasNext;

    public BoardPageResponse(List<T> items, int page, int size, boolean hasNext) {
        this.items = items;
        this.page = page;
        this.size = size;
        this.hasNext = hasNext;
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
}
