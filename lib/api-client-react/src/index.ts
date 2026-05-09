export * from "./firebase-api";
export * from "./generated/api.schemas";

export const getGetCurrentUserQueryKey = () => ["currentUser"];
export function useGetCurrentUser() {
  return { data: null, isLoading: false };
}
