import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { blogAPI } from '../../services/api';

const BlogListScreen = ({ navigation }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'astrology', label: 'Astrology' },
    { value: 'spirituality', label: 'Spirituality' },
    { value: 'lifestyle', label: 'Lifestyle' },
    { value: 'wellness', label: 'Wellness' },
    { value: 'news', label: 'News' },
  ];

  useEffect(() => {
    fetchBlogs(1, false);
  }, [selectedCategory, searchQuery]);

  const fetchBlogs = async (pageNum = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const params = {
        page: pageNum,
        limit: 10,
        sortBy: 'publishedAt',
        sortOrder: 'desc'
      };
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      console.log('📚 [BLOG_LIST] Fetching blogs with params:', params);
      const response = await blogAPI.getBlogs(params);
      console.log('✅ [BLOG_LIST] Blogs fetched:', response);
      
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
      
      if (append) {
        setBlogs(prev => [...prev, ...transformedBlogs]);
      } else {
        setBlogs(transformedBlogs);
      }
      
      setHasMore(response.currentPage < response.totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('❌ [BLOG_LIST] Error fetching blogs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchBlogs(page + 1, true);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchBlogs(1, false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderBlogItem = ({ item }) => (
    <TouchableOpacity
      style={styles.blogItem}
      onPress={() => navigation.navigate('BlogDetail', { 
        blogSlug: item.slug,
        blogId: item.id 
      })}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.image }} style={styles.blogItemImage} />
      <View style={styles.blogItemContent}>
        <View style={styles.blogItemMeta}>
          <Text style={styles.blogItemCategory}>{item.category}</Text>
          <Text style={styles.blogItemReadTime}>{item.readTime}</Text>
        </View>
        <Text style={styles.blogItemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.blogItemExcerpt} numberOfLines={2}>
          {item.excerpt}
        </Text>
        <Text style={styles.blogItemDate}>{item.publishedAt}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#F97316" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
        <Text style={styles.emptyText}>No blogs found</Text>
        <Text style={styles.emptySubtext}>
          {searchQuery || selectedCategory !== 'all'
            ? 'Try adjusting your filters'
            : 'Check back later for new content'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blog</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search blogs..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryButton,
              selectedCategory === cat.value && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(cat.value)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === cat.value && styles.categoryButtonTextActive
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Blog List */}
      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading blogs...</Text>
        </View>
      ) : (
        <FlatList
          data={blogs}
          renderItem={renderBlogItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={['#F97316']}
              tintColor="#F97316"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  blogItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  blogItemImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  blogItemContent: {
    padding: 16,
  },
  blogItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blogItemCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blogItemReadTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  blogItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    lineHeight: 24,
    marginBottom: 8,
  },
  blogItemExcerpt: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  blogItemDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default BlogListScreen;
