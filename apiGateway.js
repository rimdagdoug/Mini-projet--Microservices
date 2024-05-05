// apiGateway.js
const express = require('express');
const bodyParser = require('body-parser');
const { ApolloServer, gql } = require('apollo-server-express');
const { graphqlHTTP } = require('express-graphql');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');

// MongoDB Movie model
const Movie = require('./models/Movie');

// Load GraphQL type definitions
const typeDefs = require('./typeDefs');

// Load GraphQL resolvers
const resolvers = require('./resolvers');

// Load gRPC proto definitions
const movieProtoPath = 'movie.proto';
const movieProtoDefinition = protoLoader.loadSync(movieProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const movieProto = grpc.loadPackageDefinition(movieProtoDefinition).movie;

// Create Express app
const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mydatabase', { useNewUrlParser: true, useUnifiedTopology: true });

// REST endpoint for creating movies
app.post('/movies', async (req, res) => {
    try {
        const { title, description } = req.body;
        const movie = new Movie({ title, description });
        await movie.save();
        res.status(201).json(movie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GraphQL server setup
const apolloServer = new ApolloServer({ typeDefs, resolvers });
apolloServer.applyMiddleware({ app });

// gRPC client setup
const movieClient = new movieProto.MovieService('localhost:50051', grpc.credentials.createInsecure());

// REST endpoint for creating movies using gRPC
app.post('/movies/grpc', (req, res) => {
    const { title, description } = req.body;
    movieClient.createMovie({ title, description }, (err, response) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json(response.movie);
        }
    });
});

// GraphQL endpoint for creating movies using gRPC
app.use('/graphql/grpc', graphqlHTTP({
    schema: gql(typeDefs),
    rootValue: resolvers,
    graphiql: true,
}));

const port = 3000;
app.listen(port, () => {
    console.log(`API Gateway en cours d'exécution sur le port ${port}`);
});
