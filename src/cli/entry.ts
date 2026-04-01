import { bootstrap } from '../app/bootstrap'

export async function main(): Promise<void> {
  await bootstrap()
}

void main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
