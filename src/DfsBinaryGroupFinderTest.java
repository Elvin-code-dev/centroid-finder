import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.List;

public class DfsBinaryGroupFinderTest {

    private DfsBinaryGroupFinder finder;

    @BeforeEach
    void setUp() {
        finder = new DfsBinaryGroupFinder();
    }

    // ─── NULL / INVALID INPUT ────────────────────────────────────────────────

    @Test
    void testNullImageThrowsNullPointerException() {
        assertThrows(NullPointerException.class, () -> finder.findConnectedGroups(null));
    }

    @Test
    void testNullSubarrayThrowsNullPointerException() {
        int[][] image = {null, {1, 0}};
        assertThrows(NullPointerException.class, () -> finder.findConnectedGroups(image));
    }

    @Test
    void testEmptyImageThrowsIllegalArgumentException() {
        int[][] image = {};
        assertThrows(IllegalArgumentException.class, () -> finder.findConnectedGroups(image));
    }

    @Test
    void testNonRectangularImageThrowsIllegalArgumentException() {
        int[][] image = {
            {1, 0, 1},
            {1, 0}       // shorter row → not rectangular
        };
        assertThrows(IllegalArgumentException.class, () -> finder.findConnectedGroups(image));
    }

    @Test
    void testImageWithInvalidValueThrowsIllegalArgumentException() {
        int[][] image = {
            {1, 2},
            {0, 1}
        };
        assertThrows(IllegalArgumentException.class, () -> finder.findConnectedGroups(image));
    }

    @Test
    void testImageWithNegativeValueThrowsIllegalArgumentException() {
        int[][] image = {{-1, 1}};
        assertThrows(IllegalArgumentException.class, () -> finder.findConnectedGroups(image));
    }

    // ─── NO GROUPS ───────────────────────────────────────────────────────────

    @Test
    void testAllZerosReturnsEmptyList() {
        int[][] image = {
            {0, 0, 0},
            {0, 0, 0}
        };
        List<Group> groups = finder.findConnectedGroups(image);
        assertTrue(groups.isEmpty());
    }

    // ─── SINGLE PIXEL ────────────────────────────────────────────────────────

    @Test
    void testSingleOnePixelImage() {
        int[][] image = {{1}};
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(1, groups.size());
        assertEquals(1, groups.get(0).size());
        assertEquals(0, groups.get(0).centroid().x());
        assertEquals(0, groups.get(0).centroid().y());
    }

    @Test
    void testSingleZeroPixelImage() {
        int[][] image = {{0}};
        List<Group> groups = finder.findConnectedGroups(image);
        assertTrue(groups.isEmpty());
    }

    // ─── SINGLE ROW / COLUMN ─────────────────────────────────────────────────

    @Test
    void testSingleRowAllOnes() {
        int[][] image = {{1, 1, 1, 1}};
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(1, groups.size());
        assertEquals(4, groups.get(0).size());
        // centroid x = (0+1+2+3)/4 = 1, y = 0
        assertEquals(1, groups.get(0).centroid().x());
        assertEquals(0, groups.get(0).centroid().y());
    }

    @Test
    void testSingleColumnAllOnes() {
        int[][] image = {{1}, {1}, {1}};
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(1, groups.size());
        assertEquals(3, groups.get(0).size());
        // centroid x = 0, y = (0+1+2)/3 = 1
        assertEquals(0, groups.get(0).centroid().x());
        assertEquals(1, groups.get(0).centroid().y());
    }

    @Test
    void testSingleRowDisjointGroups() {
        // Two separate groups of 1s in one row
        int[][] image = {{1, 1, 0, 1}};
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(2, groups.size());
        // Larger group (size 2) should come first (descending order)
        assertEquals(2, groups.get(0).size());
        assertEquals(1, groups.get(1).size());
    }

    // ─── COORDINATE MAPPING ──────────────────────────────────────────────────

    @Test
    void testCoordinateMappingRowColumnToXY() {
        // Single pixel at row:4, column:7 → (x:7, y:4)
        int[][] image = new int[5][8];
        image[4][7] = 1;
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(1, groups.size());
        assertEquals(7, groups.get(0).centroid().x());
        assertEquals(4, groups.get(0).centroid().y());
    }

    // ─── CONNECTIVITY ────────────────────────────────────────────────────────

    @Test
    void testDiagonalPixelsAreNotConnected() {
        int[][] image = {
            {1, 0},
            {0, 1}
        };
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(2, groups.size());
        // Both groups have size 1
        assertEquals(1, groups.get(0).size());
        assertEquals(1, groups.get(1).size());
    }

    @Test
    void testHorizontalAndVerticalConnectionsAreConnected() {
        int[][] image = {
            {0, 1, 0},
            {1, 1, 1},
            {0, 1, 0}
        };
        // Plus-shape: all five 1s connected
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(1, groups.size());
        assertEquals(5, groups.get(0).size());
    }

    @Test
    void testLShapedGroup() {
        int[][] image = {
            {1, 0},
            {1, 0},
            {1, 1}
        };
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(1, groups.size());
        assertEquals(4, groups.get(0).size());
    }

    // ─── CENTROID (INTEGER DIVISION) ─────────────────────────────────────────

    @Test
    void testCentroidIntegerDivisionTruncates() {
        // Pixels at (x:0,y:0) and (x:1,y:0) and (x:2,y:0)
        // centroid x = (0+1+2)/3 = 1, centroid y = 0/3 = 0
        int[][] image = {{1, 1, 1}};
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(1, groups.get(0).centroid().x());
        assertEquals(0, groups.get(0).centroid().y());
    }

    @Test
    void testCentroidIntegerDivisionRoundsDown() {
        // Pixels at (x:0,y:0) and (x:1,y:0): centroid x = 1/2 = 0 (integer division)
        int[][] image = {{1, 1}};
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(0, groups.get(0).centroid().x());
        assertEquals(0, groups.get(0).centroid().y());
    }

    @Test
    void testCentroidTwoByTwoBlock() {
        int[][] image = {
            {1, 1},
            {1, 1}
        };
        // x = (0+1+0+1)/4 = 0, y = (0+0+1+1)/4 = 0
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(1, groups.size());
        assertEquals(4, groups.get(0).size());
        assertEquals(0, groups.get(0).centroid().x());
        assertEquals(0, groups.get(0).centroid().y());
    }

    // ─── SORTING (DESCENDING) ────────────────────────────────────────────────

    @Test
    void testGroupsSortedDescendingBySize() {
        int[][] image = {
            {1, 0, 1, 1, 1},
            {0, 0, 0, 0, 0},
            {1, 1, 0, 0, 0}
        };
        // Group sizes: 1, 3, 2 → sorted descending: 3, 2, 1
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(3, groups.size());
        assertTrue(groups.get(0).size() >= groups.get(1).size());
        assertTrue(groups.get(1).size() >= groups.get(2).size());
    }

    @Test
    void testMultipleGroupsDescendingOrder() {
        int[][] image = {
            {1, 1, 1, 0, 1, 1},
            {0, 0, 0, 0, 0, 0},
            {1, 0, 0, 0, 0, 0}
        };
        // Group sizes: 3, 2, 1
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(3, groups.size());
        assertEquals(3, groups.get(0).size());
        assertEquals(2, groups.get(1).size());
        assertEquals(1, groups.get(2).size());
    }

    // ─── ALL ONES ────────────────────────────────────────────────────────────

    @Test
    void testAllOnesIsOneGroup() {
        int[][] image = {
            {1, 1, 1},
            {1, 1, 1},
            {1, 1, 1}
        };
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(1, groups.size());
        assertEquals(9, groups.get(0).size());
    }

    // ─── LARGER / COMPLEX CASES ──────────────────────────────────────────────

    @Test
    void testCheckerboardPatternAllDisjoint() {
        int[][] image = {
            {1, 0, 1},
            {0, 1, 0},
            {1, 0, 1}
        };
        // All five 1s are diagonally adjacent only → 5 separate groups
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(5, groups.size());
        groups.forEach(g -> assertEquals(1, g.size()));
    }

    @Test
    void testSnakingConnectedGroup() {
        int[][] image = {
            {1, 1, 1},
            {0, 0, 1},
            {1, 1, 1}
        };
        // All 1s are connected in a U/snake shape
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(1, groups.size());
        assertEquals(7, groups.get(0).size());
    }

    @Test
    void testTwoLargeGroupsCorrectlySeparated() {
        int[][] image = {
            {1, 1, 0, 1, 1},
            {1, 1, 0, 1, 1},
            {0, 0, 0, 0, 0}
        };
        List<Group> groups = finder.findConnectedGroups(image);
        assertEquals(2, groups.size());
        assertEquals(4, groups.get(0).size());
        assertEquals(4, groups.get(1).size());
    }
}