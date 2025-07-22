import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

const API_KEY = import.meta.env.VITE_GNEWS_API_KEY;
const ARTICLES_PER_PAGE = 9;
const validCategories = ['general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology'];

function getDefaultSearchTerm(category) {
  return validCategories.includes(category) ? category : 'general';
}
function Index() {
  const [category, setCategory] = useState('general');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [listType, setListType] = useState(null);
  const [modalArticle, setModalArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listCounts, setListCounts] = useState({ liked: 0, disliked: 0, favorites: 0 });
  const [navOpen, setNavOpen] = useState(false);
  const searchInputRef = useRef();
  const hamburgerRef = useRef();
  const navRef = useRef();
  useEffect(() => {
    if (navOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [navOpen]);
  useEffect(() => {
    if (!navOpen) return;
    function handleClick(e) {
      if (
        hamburgerRef.current && hamburgerRef.current.contains(e.target)
      ) return;
      if (
        navRef.current && navRef.current.contains(e.target)
      ) return;
      setNavOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [navOpen]);
  const updateListCounts = useCallback(() => {
    setListCounts({
      liked: getUserListArticles('liked').length,
      disliked: getUserListArticles('disliked').length,
      favorites: getUserListArticles('favorites').length,
    });
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category') || 'general';
    setCategory(cat);
    setSearch('');
    setListType(params.get('list'));
    setCurrentPage(Number(params.get('page')) || 1);
  }, []);
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category') || 'general';
      setCategory(cat);
      setSearch('');
      setListType(params.get('list'));
      setCurrentPage(Number(params.get('page')) || 1);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => {
    if (listType) {
      const userArticles = getUserListArticles(listType);
      setFilteredArticles(filterArticlesByDate(userArticles, date));
      setArticles(userArticles);
    } else {
      setLoading(true);
      fetchNews(search || getDefaultSearchTerm(category), date).then(fetched => {
        setArticles(fetched);
        setFilteredArticles(filterArticlesByDate(fetched, date));
        setLoading(false);
      });
    }
    updateListCounts();
  }, [category, search, date, listType, updateListCounts]);
  function filterArticlesByDate(articles, date) {
    if (!date) return articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const selectedDate = new Date(date);
    const start = new Date(selectedDate.setHours(0,0,0,0));
    const end = new Date(selectedDate.setHours(23,59,59,999));
    return articles.filter(article => {
      const articleDate = new Date(article.publishedAt);
      return articleDate >= start && articleDate <= end;
    }).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
  function getUserListArticles(type) {
    const articles = [];
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('article_')) {
        try {
          const state = JSON.parse(localStorage.getItem(key));
          const shouldInclude = type === 'liked' ? state.userLiked : 
            type === 'disliked' ? state.userDisliked : 
            type === 'favorites' ? state.userFavorited : false;
          if (shouldInclude && state.articleData) {
            articles.push(state.articleData);
          }
        } catch { /**/ }
      }
    });
    return articles;
  }
  async function fetchNews(query, date) {
    let allArticles = [];
    const categoryMap = {
      'general': 'general',
      'sports': 'sports',
      'technology': 'technology',
      'business': 'business',
      'entertainment': 'entertainment',
      'health': 'health',
      'science': 'science',
    };
    const cat = categoryMap[query?.toLowerCase()];

    try {
      let apiUrl;
      if (cat) {
        apiUrl = `https://gnews.io/api/v4/top-headlines?category=${cat}&apikey=${API_KEY}&lang=en&country=us`;
      } else {
        apiUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&apikey=${API_KEY}&lang=en&country=us`;
      }

      if (date) {
        const fromDate = `${date}T00:00:00Z`;
        const toDate = `${date}T23:59:59Z`;
        apiUrl += `&from=${fromDate}&to=${toDate}`;
      }

      const res = await fetch(apiUrl);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorData.errors.join(', ')}`);
      }
      
      const data = await res.json();
      if (data.articles && Array.isArray(data.articles)) {
        allArticles = data.articles;
      }
    } catch (error) {
      console.error("Failed to fetch news:", error);
    }
    
    return allArticles;
  }
  const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const endIndex = Math.min(startIndex + ARTICLES_PER_PAGE, filteredArticles.length);
  const currentPageArticles = filteredArticles.slice(startIndex, endIndex);
  function handleCategoryClick(cat) {
    setCategory(cat);
    setListType(null);
    setSearch('');
    setCurrentPage(1);
    setNavOpen(false); // Close nav on click
    const params = new URLSearchParams();
    params.set('category', cat);
    params.set('page', 1);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  }
  function handleListType(type) {
    setListType(type);
    setCurrentPage(1);
    const params = new URLSearchParams();
    params.set('list', type);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  }
  function handleSearchChange(e) {
    setSearch(e.target.value);
  }
  function handleDateChange(e) {
    setDate(e.target.value);
  }
  function handlePageChange(page) {
    setCurrentPage(page);
    const params = new URLSearchParams(window.location.search);
    params.set('page', page);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  }
  function generateArticleId(article) {
    const title = article.title || '';
    const source = article.source?.name || article.source || '';
    const combined = title + source;
    return btoa(encodeURIComponent(combined)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  }
  function getArticleState(articleId) {
    const saved = localStorage.getItem(`article_${articleId}`);
    return saved ? JSON.parse(saved) : {
      likes: 0,
      dislikes: 0,
      userLiked: false,
      userDisliked: false,
      userFavorited: false
    };
  }
  function saveArticleState(articleId, state, articleData = null) {
    const dataToSave = {
      ...state,
      articleData: articleData
    };
    localStorage.setItem(`article_${articleId}`, JSON.stringify(dataToSave));
  }
  function handleAction(article, action) {
    const articleId = generateArticleId(article);
    const state = getArticleState(articleId);
    let wasInList = false;
    switch (action) {
      case 'like':
        wasInList = state.userLiked;
        state.userLiked = !state.userLiked;
        state.likes += state.userLiked ? 1 : -1;
        if (state.userLiked && state.userDisliked) {
          state.userDisliked = false;
          state.dislikes -= 1;
        }
        break;
      case 'dislike':
        wasInList = state.userDisliked;
        state.userDisliked = !state.userDisliked;
        state.dislikes += state.userDisliked ? 1 : -1;
        if (state.userDisliked && state.userLiked) {
          state.userLiked = false;
          state.likes -= 1;
        }
        break;
      case 'favorite':
        wasInList = state.userFavorited;
        state.userFavorited = !state.userFavorited;
        break;
      default:
        break;
    }
    saveArticleState(articleId, state, article);
    updateListCounts();
    if (listType) {
      const userArticles = getUserListArticles(listType);
      setArticles(userArticles);
      setFilteredArticles(filterArticlesByDate(userArticles, date));
    }
  }
  return (
    <div className="container">
      <header>
        <button
          ref={hamburgerRef}
          className={`hamburger-btn${navOpen ? ' open' : ''}`}
          aria-label="Menu"
          onClick={() => setNavOpen((open) => !open)}
        >
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
        </button>
        <a href="/">
          <img src={`123.png`} alt="Logo" style={{ width: 80, height: 80 }} />
          <h1>ABC News</h1>
        </a>
      </header>
      <nav ref={navRef} className={navOpen ? 'nav-open' : ''}>
        <div className="search-container">
          <input
            className="search"
            type="search"
            placeholder="Search..."
            value={search}
            onChange={handleSearchChange}
            ref={searchInputRef}
          />
          <input
            type="date"
            className="date-picker"
            value={date}
            onChange={handleDateChange}
          />
          <div className="user-lists">
            <button className={`list-btn${listType === 'liked' ? ' active' : ''}`} onClick={() => handleListType('liked')}>
              👍 Liked ({listCounts.liked})
            </button>
            <button className={`list-btn${listType === 'disliked' ? ' active' : ''}`} onClick={() => handleListType('disliked')}>
              👎 Disliked ({listCounts.disliked})
            </button>
            <button className={`list-btn${listType === 'favorites' ? ' active' : ''}`} onClick={() => handleListType('favorites')}>
              ⭐ Favorites ({listCounts.favorites})
            </button>
          </div>
        </div>
        <div className="nav-links">
          {validCategories.map(cat => (
            <a
              key={cat}
              href="#"
              className={`nav-link${category === cat ? ' active' : ''}`}
              onClick={() => handleCategoryClick(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </a>
          ))}
        </div>
      </nav>
      <main>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <h3>Loading news articles...</h3>
            <p>Fetching multiple pages for more content...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <h3>No news articles found.</h3>
          </div>
        ) : (
          <>
            <div className="card-container">
              {currentPageArticles.map((article, idx) => (
                <div className="news-card" key={idx} onClick={() => { console.log('Card clicked', article); setModalArticle(article); }}>
                  <img src={article.image} alt="news" />
                  <div className="news-card-content">
                    <h3>{article.title}</h3>
                    <p>{article.description}</p>
                    <h6>{(article.source?.name || article.source || 'Unknown Source') + ' • ' + (article.publishedAt ? new Date(article.publishedAt).toLocaleString('en-US', { timeZone: 'Asia/kolkata' }) : '')}</h6>
                    <div className="card-actions">
                      <button
                        className={`action-btn like-btn${getArticleState(generateArticleId(article)).userLiked ? ' liked' : ''}`}
                        onClick={e => { e.stopPropagation(); handleAction(article, 'like'); }}
                      >
                        <span className="icon">👍</span>
                        <span className="count">{getArticleState(generateArticleId(article)).likes}</span>
                      </button>
                      <button
                        className={`action-btn dislike-btn${getArticleState(generateArticleId(article)).userDisliked ? ' disliked' : ''}`}
                        onClick={e => { e.stopPropagation(); handleAction(article, 'dislike'); }}
                      >
                        <span className="icon">👎</span>
                        <span className="count">{getArticleState(generateArticleId(article)).dislikes}</span>
                      </button>
                      <button
                        className={`action-btn favorite-btn${getArticleState(generateArticleId(article)).userFavorited ? ' favorited' : ''}`}
                        onClick={e => { e.stopPropagation(); handleAction(article, 'favorite'); }}
                      >
                        <span className="icon">⭐</span>
                      </button>
                    </div>
                    <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>Read More</a>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  <span>Showing {startIndex + 1}-{endIndex} of {filteredArticles.length} articles</span>
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>← Previous</button>
                  <div className="page-numbers">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i + 1}
                        className={`page-number${currentPage === i + 1 ? ' active' : ''}`}
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button className="pagination-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      {modalArticle && (
        <div className="news-modal" onClick={() => setModalArticle(null)}>
          <div className="news-modal-content" onClick={e => e.stopPropagation()}>
            <span className="news-modal-close" onClick={() => setModalArticle(null)}>&times;</span>
            <img src={modalArticle.image || ''} alt="News" />
            <h2>{modalArticle.title}</h2>
            <h5>{(modalArticle.source?.name || modalArticle.source || '') + ' • ' + (modalArticle.publishedAt ? new Date(modalArticle.publishedAt).toLocaleString('en-US', { timeZone: 'Asia/kolkata' }) : '')}</h5>
            <hr />
            <p>{modalArticle.description}</p>
            <a href={modalArticle.url} target="_blank" rel="noopener noreferrer">Read Full Article</a>
          </div>
        </div>
      )}
    </div>
  );
}
export default Index;


