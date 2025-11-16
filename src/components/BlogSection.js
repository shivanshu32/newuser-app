import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { blogAPI } from '../services/api';

const { width } = Dimensions.get('window');

const BlogSection = ({ navigation }) => {
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeaturedBlogs();
  }, []);

  const fetchFeaturedBlogs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📚 [BLOG_SECTION] Fetching blogs from API...');
      
      // Temporarily fetch all published blogs (not just featured) until featured flag is set
      const response = await blogAPI.getBlogs({ limit: 3, status: 'published', sortBy: 'publishedAt', sortOrder: 'desc' });
      console.log('✅ [BLOG_SECTION] Blogs fetched:', response);
      
      // Transform backend data to match component expectations
      const transformedBlogs = (response.data || []).map(blog => ({
        id: blog._id,
        title: blog.title,
        excerpt: blog.excerpt || blog.content?.substring(0, 150) + '...',
        image: blog.coverImageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop',
        category: blog.category || 'General',
        readTime: `${blog.readTime || 5} min read`,
        publishedAt: formatDate(blog.publishedAt || blog.createdAt),
        slug: blog.slug
      }));
      
      console.log('✅ [BLOG_SECTION] Transformed blogs:', transformedBlogs.length);
      setBlogPosts(transformedBlogs);
    } catch (err) {
      console.error('❌ [BLOG_SECTION] Error fetching featured blogs:', err);
      setError(err.message);
      // Don't show error to user, just hide the section
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleBlogPress = (blogPost) => {
    console.log('📖 [BLOG_SECTION] Blog post pressed:', blogPost.title);
    // Navigate with slug for better SEO and fallback to ID
    navigation.navigate('BlogDetail', { 
      blogSlug: blogPost.slug,
      blogId: blogPost.id 
    });
  };

  const handleViewAllBlogs = () => {
    console.log('View all blogs pressed');
    // Navigate to blogs listing screen
    navigation.navigate('BlogList');
  };

  const renderBlogCard = (post, index) => (
    <TouchableOpacity
      key={post.id}
      style={[
        styles.blogCard,
        index === 0 && styles.firstCard,
        index === blogPosts.length - 1 && styles.lastCard,
      ]}
      onPress={() => handleBlogPress(post)}
      activeOpacity={0.9}
    >
      <Image source={{ uri: post.image }} style={styles.blogImage} />
      <View style={styles.blogContent}>
        <View style={styles.blogMeta}>
          <Text style={styles.category}>{post.category}</Text>
          <Text style={styles.readTime}>{post.readTime}</Text>
        </View>
        <Text style={styles.blogTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={styles.blogExcerpt} numberOfLines={2}>
          {post.excerpt}
        </Text>
        <Text style={styles.publishedAt}>{post.publishedAt}</Text>
      </View>
    </TouchableOpacity>
  );

  // Show section even with errors for debugging
  if (error) {
    console.log('🚫 [BLOG_SECTION] Error loading blogs:', error);
    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest from Blog</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load blogs. Please try again later.</Text>
        </View>
      </View>
    );
  }
  
  // Don't render if no blogs after loading
  if (!loading && blogPosts.length === 0) {
    console.log('🚫 [BLOG_SECTION] No blogs available');
    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest from Blog</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No blogs available at the moment.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest from Blog</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('BlogList')}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#F97316" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading blogs...</Text>
        </View>
      ) : (
        /* Blog Posts Horizontal Scroll */
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          decelerationRate="fast"
          snapToInterval={280}
          snapToAlignment="start"
        >
          {blogPosts.map((post, index) => renderBlogCard(post, index))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
    marginRight: 4,
  },
  scrollContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  blogCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  firstCard: {
    // Additional styling for first card if needed
  },
  lastCard: {
    marginRight: 16, // Ensure last card has proper spacing
  },
  blogImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  blogContent: {
    padding: 16,
  },
  blogMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  readTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  blogTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 8,
  },
  blogExcerpt: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  publishedAt: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default BlogSection;
