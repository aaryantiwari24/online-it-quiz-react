import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import api from '../services/api';

const AuthContext = createContext(null);

const STORAGE_TOKEN_KEY = 'token';
const STORAGE_USER_KEY = 'user';


/* =========================================================
   READ STORED USER
========================================================= */

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(
      STORAGE_USER_KEY
    );

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};


/* =========================================================
   SAVE SESSION
========================================================= */

const persistSession = (token, user) => {
  localStorage.setItem(
    STORAGE_TOKEN_KEY,
    token
  );

  localStorage.setItem(
    STORAGE_USER_KEY,
    JSON.stringify(user)
  );
};


/* =========================================================
   CLEAR SESSION
========================================================= */

const clearSession = () => {
  localStorage.removeItem(
    STORAGE_TOKEN_KEY
  );

  localStorage.removeItem(
    STORAGE_USER_KEY
  );
};


/* =========================================================
   AUTH PROVIDER
========================================================= */

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() =>
    localStorage.getItem(
      STORAGE_TOKEN_KEY
    )
  );

  const [user, setUser] = useState(
    readStoredUser
  );

  const [loading, setLoading] = useState(true);


  /* =======================================================
     VERIFY STORED TOKEN
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const verifyStoredToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get(
          '/auth/me'
        );

        if (!cancelled) {
          setUser(data.user);

          localStorage.setItem(
            STORAGE_USER_KEY,
            JSON.stringify(data.user)
          );
        }
      } catch {
        if (!cancelled) {
          clearSession();

          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    verifyStoredToken();

    return () => {
      cancelled = true;
    };
  }, []);


  /* =======================================================
     LOGIN
  ======================================================= */

  const login = async (
    email,
    password
  ) => {
    const { data } = await api.post(
      '/auth/login',
      {
        email,
        password,
      }
    );

    persistSession(
      data.token,
      data.user
    );

    setToken(data.token);
    setUser(data.user);

    return data.user;
  };


  /* =======================================================
     REGISTER
  ======================================================= */

  /*
   * Registration does NOT automatically login.
   */

  const register = async (
    name,
    email,
    password,
    role = 'customer'
  ) => {
    const { data } = await api.post(
      '/auth/register',
      {
        name,
        email,
        password,
        role,
      }
    );

    return data;
  };


  /* =======================================================
     UPDATE CURRENT USER
  ======================================================= */

  /*
   * Used after Supplier Profile Settings
   * successfully updates the account.
   */

  const updateCurrentUser = (
    updatedUser
  ) => {
    setUser(updatedUser);

    localStorage.setItem(
      STORAGE_USER_KEY,
      JSON.stringify(updatedUser)
    );
  };


  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = () => {
  clearSession();

  setToken(null);
  setUser(null);

  window.location.href = '/';
};

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = {
    user,
    token,

    isAuthenticated:
      Boolean(token && user),

    loading,

    login,
    register,
    updateCurrentUser,
    logout,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


/* =========================================================
   USE AUTH
========================================================= */

const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return ctx;
};


export {
  AuthProvider,
  useAuth,
};