// typeDefs.js
const { gql } = require('apollo-server');

const typeDefs = gql`
    type Movie {
        id: ID!
        title: String!
        description: String!
    }

    input CreateMovieInput {
        title: String!
        description: String!
    }

    type Mutation {
        createMovie(input: CreateMovieInput!): Movie!
    }
`;

module.exports = typeDefs;
