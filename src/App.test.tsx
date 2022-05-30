import { ApolloClient, gql, useMutation, useQuery, InMemoryCache, ApolloProvider } from '@apollo/client';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { setupServer } from 'msw/node';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';

const MUTATION_1 = gql`
    mutation DoSomething {
        doSomething {
            message
        }
    }
`;

const QUERY_1 = gql`
    query Items {
        items {
            id
        }
    }
`;

const Test = () => {
    const { data } = useQuery(QUERY_1);
    const [mutate] = useMutation(MUTATION_1, {
        awaitRefetchQueries: true,
        refetchQueries: [{ query: QUERY_1 }],
    });

    const { items = [] } = data || {};

    return (
        <>
            <button onClick={() => mutate()} type="button">
                mutate
            </button>
            {items.map((c: any) => (
                <div key={c.id}>item {c.id}</div>
            ))}
        </>
    );
};

const server = setupServer();

beforeAll(() => {
  server.listen();
});

test('Should execute refetchQueries', async () => {

    const apolloClient = new ApolloClient({
      link: new BatchHttpLink({
        uri: '/graphql',
        // batchMax: 1 => enable this to make it work again ...
      }),
      cache: new InMemoryCache(),
    });

    let count = 0;

    server.use(
        rest.post('/graphql', async (req, res, ctx) => {
            const responses = [
                [{ data: { items: [{ id: 1 }, { id: 2 }] } }],
                [{ data: { doSomething: { message: 'success' } } }],
                [{ data: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] } }],
            ];

            const response = responses[count++];

            return res(ctx.status(200), ctx.json(response));
        })
    );

    render(<ApolloProvider client={apolloClient}><Test /></ApolloProvider>);

    await screen.findByText('item 1');

    userEvent.click(screen.getByRole('button', { name: /mutate/i }));

    await screen.findByText('item 3');
});
