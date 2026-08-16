import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const env = (process.env.PLAID_ENV || 'sandbox').toLowerCase()
const basePath =
  env === 'production'
    ? PlaidEnvironments.production
    : env === 'development'
    ? PlaidEnvironments.development
    : PlaidEnvironments.sandbox

const configuration = new Configuration({
  basePath,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)
