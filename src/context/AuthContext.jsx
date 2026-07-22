import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });


  const [permissions, setPermissions] = useState(() => {
    const savedPermissions = sessionStorage.getItem("permissions");
    return savedPermissions ? JSON.parse(savedPermissions) : {};
  });


  const [ready, setReady] = useState(true);


  const login = (data) => {

    const userData = data.user || null;
    const perms = data.perms || {};

    sessionStorage.setItem(
      "authToken",
      data.token
    );

    sessionStorage.setItem(
      "user",
      JSON.stringify(userData)
    );

    sessionStorage.setItem(
      "permissions",
      JSON.stringify(perms)
    );


    setUser(userData);
    setPermissions(perms);
    setReady(true);
  };


const logout = () => {

    sessionStorage.clear();

    setUser(null);
    setPermissions({});
    setReady(true);

};


  const can = useCallback(
    (key) => {
      return permissions[key] === true;
    },
    [permissions]
  );


  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        login,
        logout,
        can,
        canSee: can,
        ready,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth(){
  return useContext(AuthContext);
}