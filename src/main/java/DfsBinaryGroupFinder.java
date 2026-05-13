package main.java;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
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
                    Group current = collect(image, r, c, visited);
                    result.add(current);
                }
            }
        }
        Collections.sort(result, Collections.reverseOrder());
        return result;
    }

    private static Group collect(int[][] image, int startRow, int startCol, boolean[][] visited) {
        Deque<int[]> stack = new ArrayDeque<>();
        stack.push(new int[]{startRow, startCol});
        visited[startRow][startCol] = true;

        int size = 0;
        int sumX = 0; // sum of column indices
        int sumY = 0; // sum of row indices

        int[][] directions = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

        while (!stack.isEmpty()) {
            int[] cell = stack.pop();
            int row = cell[0];
            int col = cell[1];

            size++;
            sumX += col; // x = column
            sumY += row; // y = row

            for (int[] dir : directions) {
                int newRow = row + dir[0];
                int newCol = col + dir[1];

                if (newRow >= 0 && newRow < image.length
                        && newCol >= 0 && newCol < image[0].length
                        && image[newRow][newCol] == 1
                        && !visited[newRow][newCol]) {
                    visited[newRow][newCol] = true;
                    stack.push(new int[]{newRow, newCol});
                }
            }
        }

        int avgX = sumX / size;
        int avgY = sumY / size;
        return new Group(size, new Coordinate(avgX, avgY));
    }
}