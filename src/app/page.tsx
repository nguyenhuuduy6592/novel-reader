import HomeClient from './HomeClient'
import packageJson from '../../package.json'

export default function Home() {
  return <HomeClient version={packageJson.version} />
}
