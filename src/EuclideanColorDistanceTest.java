import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

public class EuclideanColorDistanceTest {

    @Test
    public void sameColorDistanceIsZero() {
        EuclideanColorDistance finder = new EuclideanColorDistance();

        double result = finder.distance(0xFFA200, 0xFFA200);

        assertEquals(0.0, result, 0.0001);
    }

    @Test
    public void blackToWhiteDistance() {
        EuclideanColorDistance finder = new EuclideanColorDistance();

        double result = finder.distance(0x000000, 0xFFFFFF);
        double expected = Math.sqrt(255 * 255 + 255 * 255 + 255 * 255);

        assertEquals(expected, result, 0.0001);
    }

    @Test
    public void redToGreenDistance() {
        EuclideanColorDistance finder = new EuclideanColorDistance();

        double result = finder.distance(0xFF0000, 0x00FF00);
        double expected = Math.sqrt(255 * 255 + 255 * 255);

        assertEquals(expected, result, 0.0001);
    }

    @Test
    public void smallDifferenceTest() {
        EuclideanColorDistance finder = new EuclideanColorDistance();

        double result = finder.distance(0x010203, 0x020406);
        double expected = Math.sqrt(1 * 1 + 2 * 2 + 3 * 3);

        assertEquals(expected, result, 0.0001);
    }
}