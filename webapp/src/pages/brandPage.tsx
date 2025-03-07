// BrandPage.tsx
import React from "react";
import { useParams } from "react-router-dom";

const BrandPage: React.FC = () => {
  const { brand } = useParams<{ brand: string }>();
  const displayBrand = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Unknown';

  return (
    <div>
      <h1>{displayBrand} Watches</h1>
      <p>Details about {displayBrand} watches will go here.</p>
    </div>
  );
};

export default BrandPage;
