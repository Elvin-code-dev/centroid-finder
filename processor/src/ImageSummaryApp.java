import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

import javax.imageio.ImageIO;

  /**
   * The Image Summary Application.
   *
   * This application takes four command-line arguments:
   * 1. The path to an input image file (for example, "image.png").
   * 2. The path to the output CSV file (for example, "results/job123.csv").
   * 3. A target hex color in the format RRGGBB (for example, "FF0000" for red).
   * 4. An integer threshold for binarization.
   *
   * The application performs the following steps:
   *
   * 1. Loads the input image.
   * 2. Parses the target color from the hex string into a 24-bit integer.
   * 3. Binarizes the image by comparing each pixel's Euclidean color distance to the target color.
   *    A pixel is marked white (1) if its distance is less than the threshold; otherwise, it is marked black (0).
   * 4. Converts the binary array back to a BufferedImage and writes the binarized image to disk as "binarized.png".
   * 5. Finds connected groups of white pixels in the binary image.
   *    Pixels are connected vertically and horizontally (not diagonally).
   *    For each group, the size (number of pixels) and the centroid (calculated using integer division) are
  computed.
   * 6. Writes a CSV file to the output path provided as an argument, containing one row per group in the format
  "size,x,y".
   *    Coordinates follow the convention: (x:0, y:0) is the top-left, with x increasing to the right and y
  increasing downward.
   *
   * Usage:
   *   java ImageSummaryApp <input_image> <output_csv> <hex_target_color> <threshold>
   */
  public class ImageSummaryApp {
      public static void main(String[] args) {
          if (args.length < 4) {
              System.err.println("Usage: java ImageSummaryApp <input_image> <output_csv> <hex_target_color> <threshold>");
              System.exit(1);
          }

          String inputImagePath = args[0];
          String outputCsvPath = args[1];
          String hexTargetColor = args[2];
          int threshold = 0;
          try {
              threshold = Integer.parseInt(args[3]);
          } catch (NumberFormatException e) {
              System.err.println("Threshold must be an integer.");
              System.exit(1);
          }

          BufferedImage inputImage = null;
          try {
              inputImage = ImageIO.read(new File(inputImagePath));
          } catch (IOException e) {
              System.err.println("Error loading image: " + inputImagePath);
              e.printStackTrace();
              System.exit(1);
          }

          if (inputImage == null) {
              System.err.println("Unsupported image format or file not found: " + inputImagePath);
              System.exit(1);
          }

          int targetColor = 0;
          try {
              targetColor = Integer.parseInt(hexTargetColor, 16);
          } catch (NumberFormatException e) {
              System.err.println("Invalid hex target color. Please provide a color in RRGGBB format.");
              System.exit(1);
          }

          ColorDistanceFinder distanceFinder = new EuclideanColorDistance();
          ImageBinarizer binarizer = new DistanceImageBinarizer(distanceFinder, targetColor, threshold);

          int[][] binaryArray = binarizer.toBinaryArray(inputImage);
          BufferedImage binaryImage = binarizer.toBufferedImage(binaryArray);

          try {
              ImageIO.write(binaryImage, "png", new File("binarized.png"));
              System.out.println("Binarized image saved as binarized.png");
          } catch (IOException e) {
              System.err.println("Error saving binarized image.");
              e.printStackTrace();
              System.exit(1);
          }

          ImageGroupFinder groupFinder = new BinarizingImageGroupFinder(binarizer, new DfsBinaryGroupFinder());
          List<Group> groups = groupFinder.findConnectedGroups(inputImage);

          try (PrintWriter writer = new PrintWriter(outputCsvPath)) {
              for (Group group : groups) {
                  writer.println(group.toCsvRow());
              }
              System.out.println("Groups summary saved as " + outputCsvPath);
          } catch (FileNotFoundException e) {
              System.err.println("Error writing CSV to: " + outputCsvPath);
              e.printStackTrace();
              System.exit(1);
          }
      }
  }
