import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const Nav = styled.nav`
  background-color: #333;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 1rem;
`;

const NavLink = styled(Link)`
  color: white;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ProfileLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ProfileImage = styled.img`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
`;

export default function Navbar() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Nav>
      <NavLinks>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/brands">Brands</NavLink>
      </NavLinks>
      <NavLinks>
        {user ? (
          <>
            <ProfileLink to="/profile">
              {user.user_metadata?.avatar_url && (
                <ProfileImage
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                />
              )}
              Profile
            </ProfileLink>
            <NavLink to="/" onClick={handleSignOut}>
              Sign Out
            </NavLink>
          </>
        ) : (
          <NavLink to="/login">Login</NavLink>
        )}
      </NavLinks>
    </Nav>
  );
}
