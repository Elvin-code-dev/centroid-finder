import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class DfsBinaryGroupFinder implements BinaryGroupFinder {
   /**
    * Finds connected pixel groups of 1s in an integer array representing a binary image.
    * 
    * The input is a non-empty rectangular 2D array containing only 1s and 0s.
    * If the array or any of its subarrays are null, a NullPointerException
    * is thrown. If the array is otherwise invalid, an IllegalArgumentException
    * is thrown.
    *
    * Pixels are considered connected vertically and horizontally, NOT diagonally.
    * The top-left cell of the array (row:0, column:0) is considered to be coordinate
    * (x:0, y:0). Y increases downward and X increases to the right. For example,
    * (row:4, column:7) corresponds to (x:7, y:4).
    *
    * The method returns a list of sorted groups. The group's size is the number 
    * of pixels in the group. The centroid of the group
    * is computed as the average of each of the pixel locations across each dimension.
    * For example, the x coordinate of the centroid is the sum of all the x
    * coordinates of the pixels in the group divided by the number of pixels in that group.
    * Similarly, the y coordinate of the centroid is the sum of all the y
    * coordinates of the pixels in the group divided by the number of pixels in that group.
    * The division should be done as INTEGER DIVISION.
    *
    * The groups are sorted in DESCENDING order according to Group's compareTo method.
    * 
    * @param image a rectangular 2D array containing only 1s and 0s
    * @return the found groups of connected pixels in descending order
    */
    @Override
    public List<Group> findConnectedGroups(int[][] image) {
        if (image == null) throw new NullPointerException();
        if (image.length == 0) throw new IllegalArgumentException();

        for (int[] row : image) {
            if (row == null) throw new NullPointerException();
            if (row.length != image[0].length) throw new IllegalArgumentException();
        } 

        List<Group> result = new ArrayList<>();
        boolean[][] visited = new boolean[image.length][image[0].length];

        for (int r = 0; r < image.length; r++) {
            for (int c = 0; c < image[0].length; c++) {
                if (image[r][c] != 1 && image[r][c] != 0) throw new IllegalArgumentException();
                
                if (image[r][c] == 1 && !visited[r][c]) {
                    Group current = dfs(image, r, c, visited);

                    int avgRow = current.centroid().x() / current.size();
                    int avgCol = current.centroid().y() / current.size();

                    result.add(new Group(current.size(), new Coordinate(avgCol, avgRow)));
                }
            }
        }
        Collections.sort(result, Collections.reverseOrder());
        return result;
    }

    private static Group dfs(int[][] image, int row, int col, boolean[][] visited) {
        if (row < 0 || row >= image.length || col < 0 || col >= image[0].length || image[row][col] == 0 || visited[row][col]) {
            return new Group(0, new Coordinate(0,0));
        }

        visited[row][col] = true;

        Group groupLeft = dfs(image, row -1, col, visited);
        Group groupRight = dfs(image, row+1, col, visited);
        Group groupDown = dfs(image, row, col-1, visited);
        Group groupUp = dfs(image, row, col+1, visited);

        int centroidRow = (row + groupLeft.centroid().x() + groupRight.centroid().x() + groupDown.centroid().x() + groupUp.centroid().x());
        int centroidCol = (col + groupLeft.centroid().y() + groupRight.centroid().y() + groupDown.centroid().y() + groupUp.centroid().y());
        int groupSize = (1 + groupLeft.size() + groupRight.size() + groupDown.size() + groupUp.size());

        return new Group(groupSize, new Coordinate(centroidRow, centroidCol));
    }
    
}
