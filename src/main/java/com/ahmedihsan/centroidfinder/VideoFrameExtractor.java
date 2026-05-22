package com.ahmedihsan.centroidfinder;

import java.io.File;
import java.util.function.Consumer;

public interface VideoFrameExtractor {
    void extract(File video, Consumer<TimestampedFrame> consumer) throws Exception;
}
