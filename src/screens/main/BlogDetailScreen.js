import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Share,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { getBlogById } from '../../data/blogData';

const { width } = Dimensions.get('window');

const BlogDetailScreen = ({ route, navigation }) => {
  const { blogId } = route.params;
  const blog = getBlogById(blogId);

  if (!blog) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#666" />
        <Text style={styles.errorText}>Blog post not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${blog.title}\n\n${blog.excerpt}\n\nRead more in JyotishCall app!`,
        title: blog.title,
      });
    } catch (error) {
      console.error('Error sharing blog:', error);
    }
  };

  const formatContent = (content) => {
    // Split content by double newlines to create paragraphs
    const paragraphs = content.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      // Check if it's a heading (starts with **)
      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
        const headingText = paragraph.replace(/\*\*/g, '');
        return (
          <Text key={index} style={styles.contentHeading}>
            {headingText}
          </Text>
        );
      }
      
      // Check if it's a bullet point (starts with •)
      if (paragraph.startsWith('•')) {
        const bulletPoints = paragraph.split('\n');
        return (
          <View key={index} style={styles.bulletContainer}>
            {bulletPoints.map((point, pointIndex) => (
              <Text key={pointIndex} style={styles.bulletPoint}>
                {point}
              </Text>
            ))}
          </View>
        );
      }
      
      // Regular paragraph
      return (
        <Text key={index} style={styles.contentParagraph}>
          {paragraph}
        </Text>
      );
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Blog</Text>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Blog Image */}
        <Image source={{ uri: blog.image }} style={styles.blogImage} />
        
        {/* Blog Header Info */}
        <View style={styles.blogHeader}>
          <View style={styles.categoryContainer}>
            <Text style={styles.category}>{blog.category}</Text>
            <Text style={styles.readTime}>{blog.readTime}</Text>
          </View>
          
          <Text style={styles.title}>{blog.title}</Text>
          
          <View style={styles.metaInfo}>
            <Text style={styles.author}>By {blog.author}</Text>
            <Text style={styles.publishedAt}>{blog.publishedAt}</Text>
          </View>
          
          {/* Tags */}
          <View style={styles.tagsContainer}>
            {blog.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Blog Content */}
        <View style={styles.contentContainer}>
          {formatContent(blog.content)}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  blogImage: {
    width: width,
    height: 250,
    resizeMode: 'cover',
  },
  blogHeader: {
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  readTime: {
    fontSize: 14,
    color: '#888',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 32,
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  author: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  publishedAt: {
    fontSize: 14,
    color: '#888',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#ccc',
  },
  contentContainer: {
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  contentHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F97316',
    marginTop: 24,
    marginBottom: 12,
  },
  contentParagraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#e0e0e0',
    marginBottom: 16,
    textAlign: 'justify',
  },
  bulletContainer: {
    marginBottom: 16,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    color: '#e0e0e0',
    marginBottom: 4,
    paddingLeft: 8,
  },
  bottomSpacing: {
    height: 40,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#888',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BlogDetailScreen;
