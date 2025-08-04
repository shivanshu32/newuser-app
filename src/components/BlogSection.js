import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { getFeaturedBlogs } from '../data/blogData';

const { width } = Dimensions.get('window');

const BlogSection = ({ navigation }) => {
  // Get featured blog posts from local data
  const blogPosts = getFeaturedBlogs();

  const handleBlogPress = (blogPost) => {
    console.log('Blog post pressed:', blogPost.title);
    // Navigate to blog detail screen
    navigation.navigate('BlogDetail', { blogId: blogPost.id });
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

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest from Blog</Text>
          {/* TEMPORARILY DISABLED - BlogList screen not implemented */}
          {/*
          <TouchableOpacity
            onPress={() => navigation.navigate('BlogList')}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View All</Text>
             <Ionicons name="chevron-forward" size={16} color="#F97316" />
          </TouchableOpacity>
          */}
        </View>
      </View>

      {/* Blog Posts Horizontal Scroll */}
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
});

export default BlogSection;
