import React, { useState } from 'react'
import { RoundButton } from '../../general/RoundButton'
import styles from './P1RestoreOrBackup.module.css'
import { createNewWalletAction, changePageInfoAction } from '../../../store/actions/'

import { Store } from './../../../store/'

enum pages {
  ROOT,
  NEW_WALLET,
  LOAD_BACKUP
}

// restore backup or create new
export const P1RestoreOrBackup = () => {
  const { state, dispatch } = React.useContext(Store) // global state
  const [ page, setPage ] = useState(pages.ROOT) // local state
  const [ backup, setBackup ] = useState('') // local state

  return (
    <div className={ styles.wrapper }>
      {/* ROOT PAGE */}
      <div
        style={{ display: page === pages.ROOT ? 'block' : 'none' }}
      >
        <div
          className={ styles.title }
        >
          Need <span className={styles.Orange}>BTC</span> address to control<br />
          the domain name
        </div>
        <div
          className={ styles.buttonWrapper }
        >
          <RoundButton
            show={ (state.wallet.mnemonic.length > 0) ? 'false' : 'true' }
            onClick={() => {
              setPage(pages.NEW_WALLET)
              createNewWalletAction(state, dispatch)
            }}
          >
            I need a new wallet
          </RoundButton>
          <RoundButton
            show={ (state.wallet.mnemonic.length > 0) ? 'true' : 'false' }
            onClick={() => {
              setPage(pages.NEW_WALLET)
            }}
          >
            Current backup
          </RoundButton>
          <RoundButton
            onClick={() => {
              setPage(pages.LOAD_BACKUP)
            }}
          >
            Restore from backup
          </RoundButton>
          <RoundButton
            show={ (!!state.wallet?.address).toString() }
            onClick={() => {
              changePageInfoAction(state, dispatch, 2)
            }}
            next='true'
            colorbutton={'var(--colorHighlight)'}
          >
            Don't change wallet
          </RoundButton>
        </div>
      </div>
      {/* NEW_WALLET PAGE */}
      <div
        className={ styles.contentWrapper }
        style={{ display: page === pages.NEW_WALLET ? 'flex' : 'none' }}
      >
        <div className={ styles.describe }>
          Randomly generated for domain control
          <br /><br />
          Backup this private phrase
          or you will lose access
        </div>
        <div
          id='divBackup'
          spellCheck={ false }
          className={ styles.backup }
          onClick={ () => {
            // select div entire contents
            const thisDiv = document?.getElementById('divBackup')
            if (thisDiv) {
              window.getSelection()?.selectAllChildren(thisDiv)
            }
          }}
        >
          { state.wallet.mnemonic }
        </div>
        <div className={ styles.buttonWrapper } >
          <RoundButton
            onClick={() => {
              setPage(pages.ROOT)
            }}
            back='true'
          >
            Back
          </RoundButton>
          <RoundButton
            onClick={() => {
              setPage(pages.NEW_WALLET)
              createNewWalletAction(state, dispatch)
            }}
          >
            New
          </RoundButton>
          <RoundButton
            next='true'
            onClick={() => {
              changePageInfoAction(state, dispatch, 2)
            }}
          >
            I'm done with backup
          </RoundButton>
        </div>
      </div>
      {/* LOAD_BACKUP PAGE */}
      <div
        style={{ display: page === pages.LOAD_BACKUP ? 'block' : 'none' }}
      >
        <div className={ styles.describe }>
          Paste backup here (TODO: no validity checks yet)
        </div>
        <textarea
          className={ styles.restoreBackup }
          cols={ 30 }
          rows={ 3 }
          spellCheck={ false }
          placeholder={ '12 words' }
          onChange={e => setBackup(e.target.value)}
        ></textarea>
        <div className={ styles.buttonWrapper } >
          <RoundButton
            onClick={() => {
              setPage(pages.ROOT)
            }}
            back='true'
          >
            Back
          </RoundButton>
          <RoundButton
            // 12 words minimum separated by spaces (TODO): proper checks
            show={ (backup.split(' ').length >= 12) ? 'true' : 'false' }
            next='true'
            onClick={() => {
              createNewWalletAction(state, dispatch, backup)
              changePageInfoAction(state, dispatch, 2)
            }}
          >
            Done
          </RoundButton>
        </div>
      </div>
    </div>
  )
}

