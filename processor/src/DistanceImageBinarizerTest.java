import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.awt.image.BufferedImage;

public class DistanceImageBinarizerTest {

    // Test when all pixels are below threshold → should be all 1s.
    @Test
    public void allPixelsBecomeWhite() {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);

        image.setRGB(0, 0, 0x123456);
        image.setRGB(0, 1, 0x123456);
        image.setRGB(1, 0, 0x123456);
        image.setRGB(1, 1, 0x123456);

        ColorDistanceFinder mock = (a, b) -> 5.0;

        DistanceImageBinarizer binarizer = new DistanceImageBinarizer(mock, 0x000000, 10);

        int[][] result = binarizer.toBinaryArray(image);

        assertEquals(1, result[0][0]);
        assertEquals(1, result[1][1]);
    }

    // Test when all pixels are above threshold → should be all 0s.
    @Test
    public void allPixelsBecomeBlack() {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);

        image.setRGB(0, 0, 0xABCDEF);
        image.setRGB(1, 1, 0xABCDEF);

        ColorDistanceFinder mock = (a, b) -> 100.0;

        DistanceImageBinarizer binarizer = new DistanceImageBinarizer(mock, 0x000000, 10);

        int[][] result = binarizer.toBinaryArray(image);

        assertEquals(0, result[0][0]);
        assertEquals(0, result[1][1]);
    }

    // Test converting binary array → image.
    @Test
    public void binaryToImageWorks() {
        int[][] binary = {
                { 1, 0 },
                { 0, 1 }
        };

        DistanceImageBinarizer binarizer = new DistanceImageBinarizer(null, 0, 0);

        BufferedImage img = binarizer.toBufferedImage(binary);

        assertEquals(0xFFFFFF, img.getRGB(0, 0) & 0xFFFFFF);
        assertEquals(0x000000, img.getRGB(1, 0) & 0xFFFFFF);
        assertEquals(0x000000, img.getRGB(0, 1) & 0xFFFFFF);
        assertEquals(0xFFFFFF, img.getRGB(1, 1) & 0xFFFFFF);
    }
}