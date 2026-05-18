package com.ahmedihsan.centroidfinder;

import org.jcodec.api.FrameGrab;
import org.jcodec.common.DemuxerTrack;
import org.jcodec.common.DemuxerTrackMeta;
import org.jcodec.common.io.NIOUtils;
import org.jcodec.common.model.Picture;
import org.jcodec.containers.mp4.demuxer.MP4Demuxer;
import org.jcodec.scale.AWTUtil;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;

public class VideoExperiment {
    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.out.println("Usage: VideoExperiment <path-to-video.mp4>");
            return;
        }

        File videoFile = new File(args[0]);

        // Read metadata
        MP4Demuxer demuxer = MP4Demuxer.createMP4Demuxer(NIOUtils.readableChannel(videoFile));
        DemuxerTrack videoTrack = demuxer.getVideoTrack();
        DemuxerTrackMeta meta = videoTrack.getMeta();

        double duration = meta.getTotalDuration();
        long frameCount = meta.getTotalFrames();
        double fps = frameCount / duration;

        System.out.println("Video file : " + videoFile.getName());
        System.out.printf("Duration   : %.2f seconds%n", duration);
        System.out.println("Frames     : " + frameCount);
        System.out.printf("Frame rate : %.2f fps%n", fps);

        // Extract a frame at the 1-second mark
        FrameGrab grab = FrameGrab.createFrameGrab(NIOUtils.readableChannel(videoFile));
        grab.seekToSecondPrecise(1.0);
        Picture picture = grab.getNativeFrame();
        BufferedImage frame = AWTUtil.toBufferedImage(picture);

        System.out.println("Resolution : " + frame.getWidth() + "x" + frame.getHeight());

        File output = new File("frame_at_1s.png");
        ImageIO.write(frame, "png", output);
        System.out.println("Saved frame at 1s -> " + output.getAbsolutePath());
    }
}