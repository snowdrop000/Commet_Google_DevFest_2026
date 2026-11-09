// A video summary and a comment check run sequentially inside one analysis request.
// Leave room for authentication, Firestore and Cloud Run cold starts at the client.
export const requestTimeouts = Object.freeze({
  comment: 60_000,
  video: 120_000,
  analysis: 210_000,
  api: 5_000,
});
