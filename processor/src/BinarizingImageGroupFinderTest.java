import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.util.List;

public class BinarizingImageGroupFinderTest {

    private BinarizingImageGroupFinder finder;

    @BeforeEach
    void setUp() {
        finder = new BinarizingImageGroupFinder(
            new DistanceImageBinarizer(new EuclideanColorDistance(), 0xFFFFFF, 100),
            new DfsBinaryGroupFinder()
        );
    }

    @Test
    void testNullImageThrowsNullPointerException() {
        assertThrows(NullPointerException.class, () -> finder.findConnectedGroups(null));
    }

    @Test
    void testAllBlackImageReturnsEmptyList() {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);

        List<Group> groups = finder.findConnectedGroups(image);

        assertTrue(groups.isEmpty());
    }

    @Test
    void testSingleWhitePixelImage() {
        BufferedImage image = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, 0xFFFFFF);

        List<Group> groups = finder.findConnectedGroups(image);

        assertEquals(1, groups.size());
        assertEquals(1, groups.get(0).size());
        assertEquals(0, groups.get(0).centroid().x());
        assertEquals(0, groups.get(0).centroid().y());
    }

    @Test
    void testDiagonalPixelsAreNotConnected() {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, 0xFFFFFF);
        image.setRGB(1, 1, 0xFFFFFF);

        List<Group> groups = finder.findConnectedGroups(image);

        assertEquals(2, groups.size());
        assertEquals(1, groups.get(0).size());
        assertEquals(1, groups.get(1).size());
    }

    @Test
    void testConnectedPixelsFormSingleGroup() {
        BufferedImage image = new BufferedImage(3, 3, BufferedImage.TYPE_INT_RGB);

        image.setRGB(1, 0, 0xFFFFFF);
        image.setRGB(0, 1, 0xFFFFFF);
        image.setRGB(1, 1, 0xFFFFFF);
        image.setRGB(2, 1, 0xFFFFFF);
        image.setRGB(1, 2, 0xFFFFFF);

        List<Group> groups = finder.findConnectedGroups(image);

        assertEquals(1, groups.size());
        assertEquals(5, groups.get(0).size());
    }

    @Test
    void testGroupsReturnedInDescendingOrder() {
        BufferedImage image = new BufferedImage(5, 3, BufferedImage.TYPE_INT_RGB);

        image.setRGB(0, 0, 0xFFFFFF);

        image.setRGB(2, 0, 0xFFFFFF);
        image.setRGB(3, 0, 0xFFFFFF);
        image.setRGB(4, 0, 0xFFFFFF);

        image.setRGB(0, 2, 0xFFFFFF);
        image.setRGB(1, 2, 0xFFFFFF);

        List<Group> groups = finder.findConnectedGroups(image);

        assertEquals(3, groups.size());
        assertEquals(3, groups.get(0).size());
        assertEquals(2, groups.get(1).size());
        assertEquals(1, groups.get(2).size());
    }

    @Test
    void testCoordinateMappingColumnToXRowToY() {
        BufferedImage image = new BufferedImage(8, 5, BufferedImage.TYPE_INT_RGB);
        image.setRGB(7, 4, 0xFFFFFF);

        List<Group> groups = finder.findConnectedGroups(image);

        assertEquals(1, groups.size());
        assertEquals(7, groups.get(0).centroid().x());
        assertEquals(4, groups.get(0).centroid().y());
    }
}