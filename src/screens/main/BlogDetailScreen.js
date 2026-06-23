import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { blogAPI } from '../../services/api';
import RenderHtml from 'react-native-render-html';
import { colors, spacing, radius, shadows } from '../../theme';

const { width } = Dimensions.get('window');

const BlogDetailScreen = ({ route, navigation }) => {
  const { blogSlug, blogId } = route.params;
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBlogDetails();
  }, [blogSlug, blogId]);

  const fetchBlogDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use slug if available, otherwise use ID
      const identifier = blogSlug || blogId;
      console.log('📖 [BLOG_DETAIL] Fetching blog:', identifier);
      
      const response = await blogAPI.getBlog(identifier, true); // Increment view count
      console.log('✅ [BLOG_DETAIL] Blog fetched:', response.data);
      
      // Transform backend data
      const transformedBlog = {
        id: response.data._id,
        title: response.data.title,
        content: response.data.content,
        excerpt: response.data.excerpt,
        image: response.data.coverImageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop',
        category: response.data.category || 'General',
        readTime: `${response.data.readTime || 5} min read`,
        publishedAt: formatDate(response.data.publishedAt || response.data.createdAt),
        author: response.data.authorName || 'JyotishCall Team',
        tags: response.data.tags || []
      };
      
      setBlog(transformedBlog);
    } catch (err) {
      console.error('❌ [BLOG_DETAIL] Error fetching blog:', err);
      setError(err.message || 'Failed to load blog');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blog</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading blog...</Text>
        </View>
      </View>
    );
  }

  if (error || !blog) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.errorText}>{error || 'Blog post not found'}</Text>
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

  const formatContent = (htmlContent) => {
    // Check if content is HTML or plain text
    const isHtml = /<[^>]*>/g.test(htmlContent);
    
    if (isHtml) {
      // Render HTML content using react-native-render-html
      const tagsStyles = {
        p: {
          color: colors.textPrimary,
          fontSize: 16,
          lineHeight: 26,
          marginBottom: 16,
          textAlign: 'justify',
        },
        h1: {
          color: colors.primary,
          fontSize: 22,
          fontWeight: 'bold',
          marginTop: 24,
          marginBottom: 12,
        },
        h2: {
          color: colors.primary,
          fontSize: 20,
          fontWeight: 'bold',
          marginTop: 20,
          marginBottom: 10,
        },
        h3: {
          color: colors.primary,
          fontSize: 18,
          fontWeight: 'bold',
          marginTop: 18,
          marginBottom: 8,
        },
        ul: {
          marginBottom: 16,
        },
        li: {
          color: colors.textPrimary,
          fontSize: 16,
          lineHeight: 24,
          marginBottom: 4,
        },
        strong: {
          fontWeight: 'bold',
          color: colors.textPrimary,
        },
        em: {
          fontStyle: 'italic',
        },
        a: {
          color: colors.primary,
          textDecorationLine: 'underline',
        },
      };

      return (
        <RenderHtml
          contentWidth={width - 40}
          source={{ html: htmlContent }}
          tagsStyles={tagsStyles}
          baseStyle={{ color: colors.textPrimary }}
        />
      );
    } else {
      // Fallback to plain text rendering for backward compatibility
      const paragraphs = htmlContent.split('\n\n');
      
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
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Blog</Text>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color={colors.textPrimary} />
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary,
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
    color: colors.textPrimary,
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
    backgroundColor: colors.background,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  readTime: {
    fontSize: 14,
    color: colors.textMuted,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
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
    color: colors.success,
    fontWeight: '500',
  },
  publishedAt: {
    fontSize: 14,
    color: colors.textMuted,
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
    color: colors.divider,
  },
  contentContainer: {
    padding: 20,
    backgroundColor: colors.background,
  },
  contentHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 24,
    marginBottom: 12,
  },
  contentParagraph: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'justify',
  },
  bulletContainer: {
    marginBottom: 16,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    marginBottom: 4,
    paddingLeft: 8,
  },
  bottomSpacing: {
    height: 40,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.textMuted,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
});

export default BlogDetailScreen;
