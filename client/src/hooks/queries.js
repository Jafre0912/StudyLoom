import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../services/api.js";

// Reads
export const useCategories = () => useQuery({ queryKey: ["categories"], queryFn: api.fetchCategories, staleTime: 300000 });
export const useCourses = () => useQuery({ queryKey: ["courses"], queryFn: api.listCourses, staleTime: 30000 });
export const useCourse = (slug) => useQuery({ queryKey: ["course", slug], queryFn: () => api.fetchCourse(slug), retry: false });
export const useLearningPaths = () => useQuery({ queryKey: ["paths"], queryFn: api.fetchLearningPaths });
export const usePublicSessions = () => useQuery({ queryKey: ["public-sessions"], queryFn: api.fetchPublicSessions, refetchInterval: 30000 });
export const useCheckout = (courseId) => useQuery({ queryKey: ["checkout", courseId], queryFn: () => api.fetchCheckout(courseId), retry: false, gcTime: 0 });
export const useEnrollments = (opts = {}) => useQuery({ queryKey: ["enrollments"], queryFn: api.fetchEnrollments, ...opts });
export const useSessions = () => useQuery({ queryKey: ["sessions"], queryFn: api.fetchSessions, refetchInterval: 30000 });
export const useSession = (sid) => useQuery({ queryKey: ["session", sid], queryFn: () => api.fetchSession(sid), retry: false, refetchInterval: 15000 });
export const useAttendance = () => useQuery({ queryKey: ["attendance"], queryFn: api.fetchAttendance });
export const useCertificates = () => useQuery({ queryKey: ["certificates"], queryFn: api.fetchCertificates });
export const usePayments = () => useQuery({ queryKey: ["payments"], queryFn: api.fetchPayments });
export const useInstructorOverview = () => useQuery({ queryKey: ["instructor-overview"], queryFn: api.fetchInstructorOverview });
export const useRoster = (sid) => useQuery({ queryKey: ["roster", sid], queryFn: () => api.fetchRoster(sid), enabled: !!sid, refetchInterval: 10000 });
export const useAdmin = (key, fn) => useQuery({ queryKey: ["admin", key], queryFn: fn });

// Writes: each one refreshes the lists it affects.
export function useApiMutation(fn, invalidate = []) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })) });
}
export const useSelectBatch = () => useApiMutation(api.selectBatch, ["enrollments", "sessions", "course", "attendance"]);
export const useStartSession = () => useApiMutation(api.startSession, ["sessions", "session", "instructor-overview", "public-sessions"]);
export const useEndSession = () => useApiMutation(api.endSession, ["sessions", "session", "instructor-overview", "certificates", "enrollments", "public-sessions"]);
