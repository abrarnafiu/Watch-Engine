import React from "react";
import styled from "styled-components";

const Footer: React.FC = () => {
  return (
    <FooterContainer>
      <FooterText>&copy; 2025 Watch Search Engine. All rights reserved.</FooterText>
    </FooterContainer>
  );
};

const FooterContainer = styled.footer`
  background-color: #333;
  color: white;
  padding: 1rem;
  text-align: center;
  position: absolute;
  bottom: 0;
  width: 100%;
  font-size: 0.9rem;
`;

const FooterText = styled.p`
  margin: 0;
`;

export default Footer;
