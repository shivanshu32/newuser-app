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
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blog</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading blog...</Text>
        </View>
      </View>
    );
  }

  if (error || !blog) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#666" />
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
          color: '#e0e0e0',
          fontSize: 16,
          lineHeight: 26,
          marginBottom: 16,
          textAlign: 'justify',
        },
        h1: {
          color: '#F97316',
          fontSize: 22,
          fontWeight: 'bold',
          marginTop: 24,
          marginBottom: 12,
        },
        h2: {
          color: '#F97316',
          fontSize: 20,
          fontWeight: 'bold',
          marginTop: 20,
          marginBottom: 10,
        },
        h3: {
          color: '#F97316',
          fontSize: 18,
          fontWeight: 'bold',
          marginTop: 18,
          marginBottom: 8,
        },
        ul: {
          marginBottom: 16,
        },
        li: {
          color: '#e0e0e0',
          fontSize: 16,
          lineHeight: 24,
          marginBottom: 4,
        },
        strong: {
          fontWeight: 'bold',
          color: '#fff',
        },
        em: {
          fontStyle: 'italic',
        },
        a: {
          color: '#F97316',
          textDecorationLine: 'underline',
        },
      };

      return (
        <RenderHtml
          contentWidth={width - 40}
          source={{ html: htmlContent }}
          tagsStyles={tagsStyles}
          baseStyle={{ color: '#e0e0e0' }}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
});

export default BlogDetailScreen;
