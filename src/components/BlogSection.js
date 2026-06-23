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
import { colors, spacing, radius, shadows } from '../theme';
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
      <View style={styles.imageOverlay} />
      <View style={styles.glassContentCard}>
        <View style={styles.categoryPill}>
          <Text style={styles.category}>{post.category.toUpperCase()}</Text>
        </View>
        <Text style={styles.blogTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <View style={styles.readTimeRow}>
          <Ionicons name="time-outline" size={10} color={colors.textMuted} />
          <Text style={styles.readTime}>{post.readTime}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (error) {
    console.log('🚫 [BLOG_SECTION] Error loading blogs:', error);
    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Spiritual Journal</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load articles.</Text>
        </View>
      </View>
    );
  }

  if (!loading && blogPosts.length === 0) {
    console.log('🚫 [BLOG_SECTION] No blogs available');
    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Spiritual Journal</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No articles available.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Spiritual Journal</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('BlogList')}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading articles...</Text>
        </View>
      ) : (
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
    marginTop: 24,
    marginBottom: 0,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    marginRight: 4,
  },
  scrollContainer: {
    paddingLeft: 24,
    paddingRight: 8,
  },
  blogCard: {
    width: 280,
    height: 300,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  firstCard: {},
  lastCard: {
    marginRight: 24,
  },
  blogImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.surface,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  glassContentCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(200, 164, 106, 0.4)',
    backgroundColor: 'rgba(200, 164, 106, 0.08)',
    marginBottom: 8,
  },
  category: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  blogTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 21,
    marginBottom: 8,
  },
  readTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTime: {
    fontSize: 11,
    color: colors.textMuted,
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
    color: colors.textMuted,
    fontWeight: '500',
  },
  errorContainer: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default BlogSection;
