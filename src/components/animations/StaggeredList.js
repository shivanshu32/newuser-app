import React, { useRef, useEffect } from 'react';
import { FlatList, Animated } from 'react-native';

/**
 * StaggeredList — FlatList wrapper where items animate in with staggered delays.
 * Uses React Native's built-in Animated API.
 */

const StaggeredList = ({
  data,
  renderItem,
  keyExtractor,
  staggerDelay = 60,
  baseDuration = 300,
  translateY = 15,
  ...flatListProps
}) => {
  const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

  const renderAnimatedItem = ({ item, index }) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translate = useRef(new Animated.Value(translateY)).current;

    useEffect(() => {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: baseDuration,
            useNativeDriver: true,
          }),
          Animated.timing(translate, {
            toValue: 0,
            duration: baseDuration,
            useNativeDriver: true,
          }),
        ]).start();
      }, index * staggerDelay);

      return () => clearTimeout(timer);
    }, [index]);

    return (
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY: translate }],
        }}
      >
        {renderItem({ item, index })}
      </Animated.View>
    );
  };

  return (
    <FlatList
      {...flatListProps}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderAnimatedItem}
    />
  );
};

export default React.memo(StaggeredList);
