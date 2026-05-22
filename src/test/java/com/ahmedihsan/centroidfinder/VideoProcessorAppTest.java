package com.ahmedihsan.centroidfinder;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.awt.image.BufferedImage;

import static org.junit.jupiter.api.Assertions.*;

public class VideoProcessorAppTest {

    // Target: white (0xFFFFFF), threshold 100 — matching pixels are white, non-matching are black
    private ImageGroupFinder groupFinder;

    @BeforeEach
    void setUp() {
        groupFinder = new BinarizingImageGroupFinder(
                new DistanceImageBinarizer(new EuclideanColorDistance(), 0xFFFFFF, 100),
                new DfsBinaryGroupFinder()
        );
    }

    @Test
    void testNoMatchingPixelsProducesNegativeOneCoordinates() {
        BufferedImage allBlack = new BufferedImage(3, 3, BufferedImage.TYPE_INT_RGB);
        TimestampedFrame frame = new TimestampedFrame(0.0, allBlack);

        String line = VideoProcessorApp.buildCsvLine(frame, groupFinder);

        assertEquals("0.0000,-1,-1", line);
    }

    @Test
    void testSingleMatchingPixelProducesCorrectCentroid() {
        // White pixel at column 2, row 1 → x=2, y=1
        BufferedImage image = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        image.setRGB(2, 1, 0xFFFFFF);
        TimestampedFrame frame = new TimestampedFrame(0.0, image);

        String line = VideoProcessorApp.buildCsvLine(frame, groupFinder);

        assertEquals("0.0000,2,1", line);
    }

    @Test
    void testTimestampAppearsCorrectlyInRow() {
        BufferedImage image = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, 0xFFFFFF);
        TimestampedFrame frame = new TimestampedFrame(2.5, image);

        String line = VideoProcessorApp.buildCsvLine(frame, groupFinder);

        assertTrue(line.startsWith("2.5000,"));
    }

    @Test
    void testLargestGroupCentroidIsChosen() {
        // Two groups: one of size 3 (cols 0-2, row 0) and one of size 1 (col 0, row 2)
        // Largest group centroid: x = (0+1+2)/3 = 1, y = 0
        BufferedImage image = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, 0xFFFFFF);
        image.setRGB(1, 0, 0xFFFFFF);
        image.setRGB(2, 0, 0xFFFFFF);
        image.setRGB(0, 2, 0xFFFFFF);
        TimestampedFrame frame = new TimestampedFrame(0.0, image);

        String line = VideoProcessorApp.buildCsvLine(frame, groupFinder);

        assertEquals("0.0000,1,0", line);
    }

    @Test
    void testZeroTimestampFormattedCorrectly() {
        BufferedImage allBlack = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        TimestampedFrame frame = new TimestampedFrame(0.0, allBlack);

        String line = VideoProcessorApp.buildCsvLine(frame, groupFinder);

        assertTrue(line.startsWith("0.0000,"));
    }

    @Test
    void testFullFrameCoveredByMatchingColorProducesCentroid() {
        // 3x3 all-white image — one big group of 9, centroid at (1,1)
        BufferedImage image = new BufferedImage(3, 3, BufferedImage.TYPE_INT_RGB);
        for (int row = 0; row < 3; row++) {
            for (int col = 0; col < 3; col++) {
                image.setRGB(col, row, 0xFFFFFF);
            }
        }
        TimestampedFrame frame = new TimestampedFrame(1.0, image);

        String line = VideoProcessorApp.buildCsvLine(frame, groupFinder);

        assertEquals("1.0000,1,1", line);
    }
}
