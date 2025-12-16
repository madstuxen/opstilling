/**
 * GuideFigure Types
 * 
 * These types define the pose and animation data structures
 * that are compatible with the original HTML/CSS animation system.
 */

/**
 * A single pose/keyframe for the figure.
 * All rotation values are in degrees.
 * All translation values are in pixels (relative to base position).
 */
export interface Pose {
  // Right arm (default naming in original)
  translate_x: number;           // Shoulder X offset
  translate_y: number;           // Shoulder Y offset
  skulder_rot: number;           // Shoulder rotation (degrees)
  albue_rot: number;             // Elbow rotation (degrees)
  
  // Left arm
  translate_x_left: number;      // Shoulder X offset
  translate_y_left: number;      // Shoulder Y offset
  skulder_rot_left: number;      // Shoulder rotation (degrees)
  albue_rot_left: number;        // Elbow rotation (degrees)
  
  // Right leg
  translate_x_right_leg: number; // Hip X offset
  translate_y_right_leg: number; // Hip Y offset
  hofte_rot_right: number;       // Hip rotation (degrees)
  knae_rot_right: number;        // Knee rotation (degrees)
  
  // Left leg
  translate_x_left_leg: number;  // Hip X offset
  translate_y_left_leg: number;  // Hip Y offset
  hofte_rot_left: number;        // Hip rotation (degrees)
  knae_rot_left: number;         // Knee rotation (degrees)
  
  // Z-index control (arm in front of or behind body)
  left_arm_front: boolean;
  right_arm_front: boolean;
}

/**
 * A keyframe in an animation sequence.
 * Extends Pose with timing information.
 */
export interface AnimationKeyframe extends Pose {
  duration: number;  // Duration in seconds to reach this pose
}

/**
 * Animation data structure (matches JSON files)
 */
export interface AnimationData {
  version: string;
  type: 'timeline';
  created?: string;
  slides: AnimationKeyframe[];
}

/**
 * Props for the GuideFigure component
 */
export interface GuideFigureProps {
  /** Current pose data */
  pose?: Pose;
  
  /** Or use a named animation */
  animation?: string;
  
  /** Main body color */
  color?: string;
  
  /** Size in pixels (scales the entire figure proportionally) */
  size?: number;
  
  /** Label text displayed in the head */
  label?: string;
  
  /** Label text color */
  labelColor?: string;
  
  /** Whether animation should loop */
  loop?: boolean;
  
  /** Animation speed multiplier (1 = normal) */
  speed?: number;
  
  /** Callback when animation completes (if not looping) */
  onAnimationComplete?: () => void;
  
  /** Additional style for the container */
  style?: object;
}

/**
 * Default "kram" pose (arms crossed, standing)
 */
export const DEFAULT_POSE: Pose = {
  translate_x_left: -4,
  translate_y_left: 4,
  skulder_rot_left: -28,
  albue_rot_left: 11,
  translate_x: 3,
  translate_y: 3,
  skulder_rot: 27,
  albue_rot: -13,
  translate_x_left_leg: 0,
  translate_y_left_leg: 0,
  hofte_rot_left: 4,
  knae_rot_left: -4,
  translate_x_right_leg: 0,
  translate_y_right_leg: 0,
  hofte_rot_right: -4,
  knae_rot_right: 3,
  left_arm_front: false,
  right_arm_front: false,
};

/**
 * Neutral standing pose (arms down, standing straight)
 */
export const NEUTRAL_POSE: Pose = {
  translate_x_left: 0,
  translate_y_left: 0,
  skulder_rot_left: -70,
  albue_rot_left: 0,
  translate_x: 0,
  translate_y: 0,
  skulder_rot: 70,
  albue_rot: 0,
  translate_x_left_leg: 0,
  translate_y_left_leg: 0,
  hofte_rot_left: 0,
  knae_rot_left: 0,
  translate_x_right_leg: 0,
  translate_y_right_leg: 0,
  hofte_rot_right: 0,
  knae_rot_right: 0,
  left_arm_front: false,
  right_arm_front: false,
};

