// API base URL — uses env variable in production, localhost in development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export default API_URL;
