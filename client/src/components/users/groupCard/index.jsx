import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import Thumbnail from "./Thumbnail";
import Body from "./Body";
import Footer from "./Footer";

const StyledCard = styled.div`
  .card {
    display: flex;
    margin: 2.4em 0 1rem 0;
    flex-direction: column;
    font-family: "Nanum Gothic", sans-serif;
    font-weight: bold;

    width: 19rem;
    height: 32rem;
    background-color: whitesmoke;
    border-radius: 0.2rem;
    padding-bottom: 1.3rem;
    box-shadow: 0 17px 30px 0 rgba(0, 0, 0, 0.2);
    &:hover {
      box-shadow: none;
    }
  }
`;

const StudyGroupCard = ({ groupData }) => {
  return (
    <StyledCard className="card-wrapper">
      <Link to={`/group/detail/${groupData._id}`}>
        <div className="card">
          <Thumbnail src={groupData.thumbnail} alt={groupData.alt} />
          <Body bodyData={{ ...groupData }} />
          <Footer footerData={{ ...groupData }} />
        </div>
      </Link>
    </StyledCard>
  );
};

export default StudyGroupCard;
