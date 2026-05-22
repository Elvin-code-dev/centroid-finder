package com.ahmedihsan.centroidfinder;

import org.jcodec.api.FrameGrab;
import org.jcodec.api.JCodecException;
import org.jcodec.common.DemuxerTrack;
import org.jcodec.common.DemuxerTrackMeta;
import org.jcodec.common.io.NIOUtils;
import org.jcodec.common.model.Picture;
import org.jcodec.containers.mp4.demuxer.MP4Demuxer;
import org.jcodec.scale.AWTUtil;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class JCodecVideoFrameExtractor implements VideoFrameExtractor {

    @Override
    public List<TimestampedFrame> extract(File video) throws IOException, JCodecException {
        MP4Demuxer demuxer = MP4Demuxer.createMP4Demuxer(NIOUtils.readableChannel(video));
        DemuxerTrack videoTrack = demuxer.getVideoTrack();
        DemuxerTrackMeta meta = videoTrack.getMeta();

        long frameCount = meta.getTotalFrames();
        double duration = meta.getTotalDuration();
        double fps = frameCount / duration;

        FrameGrab grab = FrameGrab.createFrameGrab(NIOUtils.readableChannel(video));

        List<TimestampedFrame> frames = new ArrayList<>();
        int index = 0;
        Picture picture;
        while ((picture = grab.getNativeFrame()) != null) {
            double seconds = index / fps;
            BufferedImage image = AWTUtil.toBufferedImage(picture);
            frames.add(new TimestampedFrame(seconds, image));
            index++;
        }

        return frames;
    }
}
