import CodeDisplayClient from './CodeDisplayClient'
import packageJson from '../../../package.json'

export default function Page() {
  return <CodeDisplayClient version={packageJson.version} />
}
