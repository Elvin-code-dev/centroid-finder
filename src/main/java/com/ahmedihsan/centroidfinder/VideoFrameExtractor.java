package com.ahmedihsan.centroidfinder;

import java.io.File;
import java.util.List;

public interface VideoFrameExtractor {
    List<TimestampedFrame> extract(File video) throws Exception;
}
