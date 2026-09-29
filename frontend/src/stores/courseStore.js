import { create } from 'zustand';
import { COURSES } from '../data/mockData';

export const useCourseStore = create((set, get) => ({
  // State
  courses: COURSES,
  selectedCourse: null,
  courseProgress: {},
  searchQuery: '',
  categoryFilter: 'All Categories',
  levelFilter: 'All Levels',

  // Actions
  setCourses: (courses) => set({ courses }),

  setSelectedCourse: (course) => set({ selectedCourse: course }),

  clearSelectedCourse: () => set({ selectedCourse: null }),

  updateCourseProgress: (courseId, progressData) => {
    set((state) => ({
      courseProgress: {
        ...state.courseProgress,
        [courseId]: {
          ...state.courseProgress[courseId],
          ...progressData
        }
      }
    }));
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setCategoryFilter: (category) => set({ categoryFilter: category }),

  setLevelFilter: (level) => set({ levelFilter: level }),

  // Computed
  getFilteredCourses: () => {
    const { courses, searchQuery, categoryFilter, levelFilter } = get();
    return courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           course.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All Categories' || course.category === categoryFilter;
      const matchesLevel = levelFilter === 'All Levels' || course.level === levelFilter;
      return matchesSearch && matchesCategory && matchesLevel;
    });
  },

  getCourseById: (courseId) => {
    return get().courses.find(course => course.id === courseId);
  },

  getCoursesByDepartment: (department) => {
    const { courses } = get();
    return courses.filter(course => 
      course.mandatoryFor?.includes(department) || 
      course.mandatoryFor?.includes('All Roles')
    );
  }
}));
