package com.ahmedihsan.centroidfinder;

import java.io.File;
import java.io.PrintWriter;
import java.util.List;

public class VideoProcessorApp {
    public static void main(String[] args) {
        if (args.length < 4) {
            System.out.println("Usage: java -jar videoprocessor.jar inputPath outputCsv targetColor threshold");
            return;
        }

        String inputPath = args[0];
        String outputCsv = args[1];
        String hexTargetColor = args[2];
        int threshold;
        try {
            threshold = Integer.parseInt(args[3]);
        } catch (NumberFormatException e) {
            System.err.println("Threshold must be an integer.");
            return;
        }

        int targetColor;
        try {
            targetColor = Integer.parseInt(hexTargetColor, 16);
        } catch (NumberFormatException e) {
            System.err.println("Invalid hex target color. Please provide a color in RRGGBB format.");
            return;
        }

        ColorDistanceFinder distanceFinder = new EuclideanColorDistance();
        ImageBinarizer binarizer = new DistanceImageBinarizer(distanceFinder, targetColor, threshold);
        ImageGroupFinder groupFinder = new BinarizingImageGroupFinder(binarizer, new DfsBinaryGroupFinder());

        VideoFrameExtractor extractor = new JCodecVideoFrameExtractor();

        try (PrintWriter writer = new PrintWriter(outputCsv)) {
            extractor.extract(new File(inputPath), frame -> writer.println(buildCsvLine(frame, groupFinder)));
            System.out.println("Output written to " + outputCsv);
        } catch (Exception e) {
            System.err.println("Error processing video: " + inputPath);
            e.printStackTrace();
        }
    }

    static String buildCsvLine(TimestampedFrame frame, ImageGroupFinder groupFinder) {
        List<Group> groups = groupFinder.findConnectedGroups(frame.image());
        Coordinate centroid = groups.isEmpty() ? new Coordinate(-1, -1) : groups.get(0).centroid();
        return String.format("%.4f,%d,%d", frame.seconds(), centroid.x(), centroid.y());
    }
}
