import { useSearchParams } from 'react-router-dom'
import './App.css'
import MyStagesList from './MyStageList';
import Game from './Game';

function BuildPage() {
  const [searchParams] = useSearchParams();
  // /build?continue=1 resumes the stage in progress; plain /build starts empty.
  const draft = searchParams.has('continue');

  return (
    <>
      <div className="page-head">
        <h1>{draft ? 'Keep building' : 'Build a stage'}</h1>
        <p className="hint">
          Pick an element on the left, click to place it. Save, play or exit on the right.
        </p>
      </div>

      <Game mode="build" draft={draft} />

      <div className="panel">
        <MyStagesList />
      </div>
    </>
  )
}

export default BuildPage
