import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { newsApi, categoryApi } from "../../services/api";
import { Article, Category, Pagination, NewsParams } from "../../types";
import { log } from "console";

interface NewsState {
  articles: Article[];
  pagination: Pagination | null;
  currentArticle: Article | null;
  featuredNews: Article[];
  categories: Category[];
  loading: boolean;
  error: string | null;
}

const initialState: NewsState = {
  articles: [],
  pagination: null,
  currentArticle: null,
  featuredNews: [],
  categories: [],
  loading: false,
  error: null,
};

type ApiError = { response?: { data?: { error?: string } } };
const extractError = (err: unknown, fallback: string): string =>
  (err as ApiError).response?.data?.error ?? fallback;

export const fetchNews = createAsyncThunk<
  { data: Article[]; pagination: Pagination },
  NewsParams | undefined,
  { rejectValue: string }
>("news/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const res = await newsApi.getAll(params);
    return res.data as { data: Article[]; pagination: Pagination };
  } catch (err) {
    return rejectWithValue(extractError(err, "Failed to fetch news"));
  }
});

export const fetchNewsArticle = createAsyncThunk<
  Article,
  string,
  { rejectValue: string }
>("news/fetchOne", async (slug, { rejectWithValue }) => {
  try {
    const res = await newsApi.getBySlug(slug);
    console.log("News: ", res.data);
    return (res.data as { data: Article }).data;
  } catch (err) {
    return rejectWithValue(extractError(err, "Article not found"));
  }
});

export const fetchFeaturedNews = createAsyncThunk<
  Article[],
  void,
  { rejectValue: string }
>("news/fetchFeatured", async (_, { rejectWithValue }) => {
  try {
    const res = await newsApi.getAll({ featured: "true", limit: 5 });
    return (res.data as { data: Article[] }).data;
  } catch (err) {
    return rejectWithValue(extractError(err, "Failed to fetch featured news"));
  }
});

export const fetchCategories = createAsyncThunk<
  Category[],
  void,
  { rejectValue: string }
>("news/fetchCategories", async (_, { rejectWithValue }) => {
  try {
    const res = await categoryApi.getAll();
    return (res.data as { data: Category[] }).data;
  } catch (err) {
    return rejectWithValue(extractError(err, "Failed to fetch categories"));
  }
});

const newsSlice = createSlice({
  name: "news",
  initialState,
  reducers: {
    clearCurrentArticle(state) {
      state.currentArticle = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNews.fulfilled, (state, action) => {
        state.loading = false;
        state.articles = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(
        fetchNews.rejected,
        (state, action: PayloadAction<string | undefined>) => {
          state.loading = false;
          state.error = action.payload ?? "Error";
        },
      )
      .addCase(fetchNewsArticle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNewsArticle.fulfilled, (state, action) => {
        state.loading = false;
        state.currentArticle = action.payload;
      })
      .addCase(
        fetchNewsArticle.rejected,
        (state, action: PayloadAction<string | undefined>) => {
          state.loading = false;
          state.error = action.payload ?? "Error";
        },
      )
      .addCase(fetchFeaturedNews.fulfilled, (state, action) => {
        state.featuredNews = action.payload;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      });
  },
});

export const { clearCurrentArticle } = newsSlice.actions;
export default newsSlice.reducer;
