/**
 * GuideFigure Component (Simple Version)
 * 
 * An animated stick figure built with react-native-svg.
 * Uses React Native's built-in Animated API (no native dependencies).
 * 
 * Dependencies:
 * - react-native-svg (only)
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { G, Rect, Circle, Text as SvgText } from 'react-native-svg';

import { Pose, GuideFigureProps, DEFAULT_POSE } from './types';

// Create animated versions of SVG components
const AnimatedG = Animated.createAnimatedComponent(G);

// Figure geometry constants (matching original HTML/CSS)
const GEOMETRY = {
  // ViewBox dimensions
  viewBoxWidth: 140,
  viewBoxHeight: 260,
  
  // Head
  headRadius: 36,
  headCenterX: 70,
  headCenterY: 40,
  
  // Torso
  torsoWidth: 60,
  torsoHeight: 80,
  torsoX: 40,
  torsoY: 82,
  torsoRxTop: 30,
  torsoRyBottom: 20,
  
  // Arms
  armWidth: 50,
  armHeight: 18,
  armRadius: 9,
  
  // Shoulders (pivot points relative to torso)
  shoulderLeftX: 47,
  shoulderLeftY: 84,
  shoulderRightX: 93,
  shoulderRightY: 84,
  
  // Legs
  thighWidth: 18,
  thighHeight: 55,
  shinWidth: 18,
  shinHeight: 50,
  legRadius: 9,
  
  // Hips (pivot points)
  hipLeftX: 52,
  hipLeftY: 152,
  hipRightX: 88,
  hipRightY: 152,
  
  // Elbow offset from shoulder
  elbowOffset: 42,
  
  // Knee offset from hip
  kneeOffset: 48,
};

/**
 * Arm component with animated joints
 */
interface ArmProps {
  translateX: Animated.Value;
  translateY: Animated.Value;
  shoulderRotation: Animated.Value;
  elbowRotation: Animated.Value;
  pivotX: number;
  pivotY: number;
  isLeft: boolean;
  color: string;
}

const Arm: React.FC<ArmProps> = ({
  translateX,
  translateY,
  shoulderRotation,
  elbowRotation,
  pivotX,
  pivotY,
  isLeft,
  color,
}) => {
  const geo = GEOMETRY;
  const xOffset = isLeft ? -geo.armWidth + 8 : -8;
  const jointX = isLeft ? -geo.elbowOffset + 8 : geo.elbowOffset - 8;
  const segment2X = isLeft ? -geo.armWidth + 8 : -8;

  // Combine translation with pivot
  const combinedTranslateX = Animated.add(translateX, pivotX);
  const combinedTranslateY = Animated.add(translateY, pivotY);

  return (
    <AnimatedG
      translateX={combinedTranslateX}
      translateY={combinedTranslateY}
    >
      <AnimatedG rotation={shoulderRotation}>
        {/* Upper arm */}
        <Rect
          x={xOffset}
          y={-geo.armHeight / 2}
          width={geo.armWidth}
          height={geo.armHeight}
          rx={geo.armRadius}
          ry={geo.armRadius}
          fill={color}
        />
        {/* Elbow pivot */}
        <G x={jointX} y={0}>
          <AnimatedG rotation={elbowRotation}>
            {/* Lower arm */}
            <Rect
              x={segment2X}
              y={-geo.armHeight / 2}
              width={geo.armWidth}
              height={geo.armHeight}
              rx={geo.armRadius}
              ry={geo.armRadius}
              fill={color}
            />
          </AnimatedG>
        </G>
      </AnimatedG>
    </AnimatedG>
  );
};

/**
 * Leg component with animated joints
 */
interface LegProps {
  translateX: Animated.Value;
  translateY: Animated.Value;
  hipRotation: Animated.Value;
  kneeRotation: Animated.Value;
  pivotX: number;
  pivotY: number;
  color: string;
}

const Leg: React.FC<LegProps> = ({
  translateX,
  translateY,
  hipRotation,
  kneeRotation,
  pivotX,
  pivotY,
  color,
}) => {
  const geo = GEOMETRY;

  const combinedTranslateX = Animated.add(translateX, pivotX);
  const combinedTranslateY = Animated.add(translateY, pivotY);

  return (
    <AnimatedG
      translateX={combinedTranslateX}
      translateY={combinedTranslateY}
    >
      <AnimatedG rotation={hipRotation}>
        {/* Thigh */}
        <Rect
          x={-geo.thighWidth / 2}
          y={-4}
          width={geo.thighWidth}
          height={geo.thighHeight}
          rx={geo.legRadius}
          ry={geo.legRadius}
          fill={color}
        />
        {/* Knee pivot */}
        <G y={geo.kneeOffset}>
          <AnimatedG rotation={kneeRotation}>
            {/* Shin */}
            <Rect
              x={-geo.shinWidth / 2}
              y={-4}
              width={geo.shinWidth}
              height={geo.shinHeight}
              rx={geo.legRadius}
              ry={geo.legRadius}
              fill={color}
            />
          </AnimatedG>
        </G>
      </AnimatedG>
    </AnimatedG>
  );
};

/**
 * Main GuideFigure component
 */
export const GuideFigure: React.FC<GuideFigureProps> = ({
  pose = DEFAULT_POSE,
  color = '#d97706',
  size = 150,
  label = '',
  labelColor = '#ffffff',
  style,
}) => {
  const geo = GEOMETRY;

  // Animated values for all joints
  // Right arm
  const rightArmTx = useRef(new Animated.Value(pose.translate_x)).current;
  const rightArmTy = useRef(new Animated.Value(pose.translate_y)).current;
  const rightShoulderRot = useRef(new Animated.Value(pose.skulder_rot)).current;
  const rightElbowRot = useRef(new Animated.Value(pose.albue_rot)).current;

  // Left arm
  const leftArmTx = useRef(new Animated.Value(pose.translate_x_left)).current;
  const leftArmTy = useRef(new Animated.Value(pose.translate_y_left)).current;
  const leftShoulderRot = useRef(new Animated.Value(pose.skulder_rot_left)).current;
  const leftElbowRot = useRef(new Animated.Value(pose.albue_rot_left)).current;

  // Right leg
  const rightLegTx = useRef(new Animated.Value(pose.translate_x_right_leg)).current;
  const rightLegTy = useRef(new Animated.Value(pose.translate_y_right_leg)).current;
  const rightHipRot = useRef(new Animated.Value(pose.hofte_rot_right)).current;
  const rightKneeRot = useRef(new Animated.Value(pose.knae_rot_right)).current;

  // Left leg
  const leftLegTx = useRef(new Animated.Value(pose.translate_x_left_leg)).current;
  const leftLegTy = useRef(new Animated.Value(pose.translate_y_left_leg)).current;
  const leftHipRot = useRef(new Animated.Value(pose.hofte_rot_left)).current;
  const leftKneeRot = useRef(new Animated.Value(pose.knae_rot_left)).current;

  // Animate to new pose when it changes
  useEffect(() => {
    const duration = 300;
    const easing = Easing.out(Easing.cubic);

    Animated.parallel([
      // Right arm
      Animated.timing(rightArmTx, { toValue: pose.translate_x, duration, easing, useNativeDriver: false }),
      Animated.timing(rightArmTy, { toValue: pose.translate_y, duration, easing, useNativeDriver: false }),
      Animated.timing(rightShoulderRot, { toValue: pose.skulder_rot, duration, easing, useNativeDriver: false }),
      Animated.timing(rightElbowRot, { toValue: pose.albue_rot, duration, easing, useNativeDriver: false }),
      
      // Left arm
      Animated.timing(leftArmTx, { toValue: pose.translate_x_left, duration, easing, useNativeDriver: false }),
      Animated.timing(leftArmTy, { toValue: pose.translate_y_left, duration, easing, useNativeDriver: false }),
      Animated.timing(leftShoulderRot, { toValue: pose.skulder_rot_left, duration, easing, useNativeDriver: false }),
      Animated.timing(leftElbowRot, { toValue: pose.albue_rot_left, duration, easing, useNativeDriver: false }),
      
      // Right leg
      Animated.timing(rightLegTx, { toValue: pose.translate_x_right_leg, duration, easing, useNativeDriver: false }),
      Animated.timing(rightLegTy, { toValue: pose.translate_y_right_leg, duration, easing, useNativeDriver: false }),
      Animated.timing(rightHipRot, { toValue: pose.hofte_rot_right, duration, easing, useNativeDriver: false }),
      Animated.timing(rightKneeRot, { toValue: pose.knae_rot_right, duration, easing, useNativeDriver: false }),
      
      // Left leg
      Animated.timing(leftLegTx, { toValue: pose.translate_x_left_leg, duration, easing, useNativeDriver: false }),
      Animated.timing(leftLegTy, { toValue: pose.translate_y_left_leg, duration, easing, useNativeDriver: false }),
      Animated.timing(leftHipRot, { toValue: pose.hofte_rot_left, duration, easing, useNativeDriver: false }),
      Animated.timing(leftKneeRot, { toValue: pose.knae_rot_left, duration, easing, useNativeDriver: false }),
    ]).start();
  }, [pose]);

  // Calculate scaled dimensions
  const aspectRatio = geo.viewBoxHeight / geo.viewBoxWidth;
  const width = size;
  const height = size * aspectRatio;

  // Font size scales with figure size
  const fontSize = Math.max(8, size * 0.08);

  return (
    <View style={[{ width, height }, style]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${geo.viewBoxWidth} ${geo.viewBoxHeight}`}
      >
        {/* Arms (behind body by default) */}
        <G>
          <Arm
            translateX={leftArmTx}
            translateY={leftArmTy}
            shoulderRotation={leftShoulderRot}
            elbowRotation={leftElbowRot}
            pivotX={geo.shoulderLeftX}
            pivotY={geo.shoulderLeftY}
            isLeft={true}
            color={color}
          />
          <Arm
            translateX={rightArmTx}
            translateY={rightArmTy}
            shoulderRotation={rightShoulderRot}
            elbowRotation={rightElbowRot}
            pivotX={geo.shoulderRightX}
            pivotY={geo.shoulderRightY}
            isLeft={false}
            color={color}
          />
        </G>

        {/* Legs */}
        <G>
          <Leg
            translateX={leftLegTx}
            translateY={leftLegTy}
            hipRotation={leftHipRot}
            kneeRotation={leftKneeRot}
            pivotX={geo.hipLeftX}
            pivotY={geo.hipLeftY}
            color={color}
          />
          <Leg
            translateX={rightLegTx}
            translateY={rightLegTy}
            hipRotation={rightHipRot}
            kneeRotation={rightKneeRot}
            pivotX={geo.hipRightX}
            pivotY={geo.hipRightY}
            color={color}
          />
        </G>

        {/* Torso */}
        <Rect
          x={geo.torsoX}
          y={geo.torsoY}
          width={geo.torsoWidth}
          height={geo.torsoHeight}
          rx={geo.torsoRxTop}
          ry={geo.torsoRyBottom}
          fill={color}
        />

        {/* Head */}
        <Circle
          cx={geo.headCenterX}
          cy={geo.headCenterY}
          r={geo.headRadius}
          fill={color}
        />
        
        {/* Head label */}
        {label ? (
          <SvgText
            x={geo.headCenterX}
            y={geo.headCenterY}
            fontSize={fontSize}
            fontWeight="bold"
            fill={labelColor}
            textAnchor="middle"
            alignmentBaseline="central"
          >
            {label}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
};

export default GuideFigure;
