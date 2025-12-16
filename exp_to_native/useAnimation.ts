/**
 * useAnimation Hook (Simple Version)
 * 
 * Plays keyframe animations on a GuideFigure.
 * Uses React Native's built-in Animated API (no native dependencies).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimationData, AnimationKeyframe, Pose, DEFAULT_POSE } from './types';

// Animation library - import and register your animations here
// Example:
// import vinkeAnimation from './animations/vinke.json';
// registerAnimation('vinke', vinkeAnimation);

const ANIMATIONS: Record<string, AnimationData> = {};

interface UseAnimationOptions {
  /** Animation name (must be registered in ANIMATIONS) */
  animation?: string;
  
  /** Whether to loop the animation */
  loop?: boolean;
  
  /** Speed multiplier (1 = normal speed) */
  speed?: number;
  
  /** Callback when animation completes (if not looping) */
  onComplete?: () => void;
  
  /** Whether to auto-play on mount */
  autoPlay?: boolean;
}

interface UseAnimationReturn {
  /** Current pose to pass to GuideFigure */
  pose: Pose;
  
  /** Whether animation is currently playing */
  isPlaying: boolean;
  
  /** Start or resume the animation */
  play: () => void;
  
  /** Pause the animation */
  pause: () => void;
  
  /** Stop and reset to first frame */
  stop: () => void;
  
  /** Jump to a specific keyframe */
  goToFrame: (index: number) => void;
}

/**
 * Interpolate between two poses
 */
function interpolatePose(from: Pose, to: Pose, progress: number): Pose {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  
  return {
    translate_x: lerp(from.translate_x, to.translate_x, progress),
    translate_y: lerp(from.translate_y, to.translate_y, progress),
    skulder_rot: lerp(from.skulder_rot, to.skulder_rot, progress),
    albue_rot: lerp(from.albue_rot, to.albue_rot, progress),
    
    translate_x_left: lerp(from.translate_x_left, to.translate_x_left, progress),
    translate_y_left: lerp(from.translate_y_left, to.translate_y_left, progress),
    skulder_rot_left: lerp(from.skulder_rot_left, to.skulder_rot_left, progress),
    albue_rot_left: lerp(from.albue_rot_left, to.albue_rot_left, progress),
    
    translate_x_right_leg: lerp(from.translate_x_right_leg, to.translate_x_right_leg, progress),
    translate_y_right_leg: lerp(from.translate_y_right_leg, to.translate_y_right_leg, progress),
    hofte_rot_right: lerp(from.hofte_rot_right, to.hofte_rot_right, progress),
    knae_rot_right: lerp(from.knae_rot_right, to.knae_rot_right, progress),
    
    translate_x_left_leg: lerp(from.translate_x_left_leg, to.translate_x_left_leg, progress),
    translate_y_left_leg: lerp(from.translate_y_left_leg, to.translate_y_left_leg, progress),
    hofte_rot_left: lerp(from.hofte_rot_left, to.hofte_rot_left, progress),
    knae_rot_left: lerp(from.knae_rot_left, to.knae_rot_left, progress),
    
    // Boolean values snap at 50%
    left_arm_front: progress < 0.5 ? from.left_arm_front : to.left_arm_front,
    right_arm_front: progress < 0.5 ? from.right_arm_front : to.right_arm_front,
  };
}

/**
 * Convert AnimationKeyframe to Pose (removes duration)
 */
function keyframeToPose(keyframe: AnimationKeyframe): Pose {
  const { duration, ...pose } = keyframe;
  return pose as Pose;
}

/**
 * Hook for playing animations on GuideFigure
 */
export function useAnimation(options: UseAnimationOptions = {}): UseAnimationReturn {
  const {
    animation,
    loop = false,
    speed = 1,
    onComplete,
    autoPlay = true,
  } = options;

  const [pose, setPose] = useState<Pose>(DEFAULT_POSE);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const currentFrameRef = useRef(0);
  const frameStartTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const animationDataRef = useRef<AnimationData | null>(null);

  // Load animation data
  useEffect(() => {
    if (animation && ANIMATIONS[animation]) {
      animationDataRef.current = ANIMATIONS[animation];
      currentFrameRef.current = 0;
      
      // Set initial pose
      if (animationDataRef.current.slides.length > 0) {
        setPose(keyframeToPose(animationDataRef.current.slides[0]));
      }
      
      if (autoPlay) {
        setIsPlaying(true);
      }
    } else {
      animationDataRef.current = null;
      setPose(DEFAULT_POSE);
    }
  }, [animation, autoPlay]);

  // Animation loop using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || !animationDataRef.current) {
      return;
    }

    const slides = animationDataRef.current.slides;
    if (slides.length === 0) return;

    frameStartTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!animationDataRef.current) return;
      
      const slides = animationDataRef.current.slides;
      const currentFrame = currentFrameRef.current;
      const nextFrame = (currentFrame + 1) % slides.length;
      
      const currentKeyframe = slides[currentFrame];
      const nextKeyframe = slides[nextFrame];
      
      const elapsed = (currentTime - frameStartTimeRef.current) / 1000;
      const frameDuration = (nextKeyframe.duration || 0.3) / speed;
      const progress = Math.min(elapsed / frameDuration, 1);
      
      // Interpolate pose
      const interpolated = interpolatePose(
        keyframeToPose(currentKeyframe),
        keyframeToPose(nextKeyframe),
        progress
      );
      setPose(interpolated);
      
      // Check if frame is complete
      if (progress >= 1) {
        currentFrameRef.current = nextFrame;
        frameStartTimeRef.current = currentTime;
        
        // Check if animation is complete
        if (nextFrame === 0 && !loop) {
          setIsPlaying(false);
          onComplete?.();
          return;
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, loop, speed, onComplete]);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    currentFrameRef.current = 0;
    
    if (animationDataRef.current && animationDataRef.current.slides.length > 0) {
      setPose(keyframeToPose(animationDataRef.current.slides[0]));
    } else {
      setPose(DEFAULT_POSE);
    }
  }, []);

  const goToFrame = useCallback((index: number) => {
    if (animationDataRef.current) {
      const slides = animationDataRef.current.slides;
      if (index >= 0 && index < slides.length) {
        currentFrameRef.current = index;
        setPose(keyframeToPose(slides[index]));
        frameStartTimeRef.current = performance.now();
      }
    }
  }, []);

  return {
    pose,
    isPlaying,
    play,
    pause,
    stop,
    goToFrame,
  };
}

/**
 * Register a new animation at runtime
 */
export function registerAnimation(name: string, data: AnimationData): void {
  ANIMATIONS[name] = data;
}

/**
 * Get all registered animation names
 */
export function getAnimationNames(): string[] {
  return Object.keys(ANIMATIONS);
}

/**
 * Load animation from a URL
 */
export async function loadAnimationFromUrl(name: string, url: string): Promise<void> {
  try {
    const response = await fetch(url);
    const data: AnimationData = await response.json();
    registerAnimation(name, data);
  } catch (error) {
    console.error(`Failed to load animation "${name}" from ${url}:`, error);
    throw error;
  }
}

export default useAnimation;
