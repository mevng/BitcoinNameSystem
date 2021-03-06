import React from 'react'
import { RoundButton } from '../../general/RoundButton'
import { Details } from './../../general/Details'
import styles from './P5CustomForwards.module.css'
import { Store, getOwner } from '../../../store/'
import {
  changePageInfoAction,
  changeChoicesBNSAction
} from '../../../store/actions'
import {
  stringByteCount,
  BYTES_MAX,
  findLatestForwards,
  interpretCommand,
  getStealthAddress
} from '../../../helpers/bns'

import sanitize from '../../../helpers/sanitize'
import bs58check from 'bs58check'

type Planned_Changes = { [key: string]: string }

/**
 * Component for page where user can edit custom forwards information.
 * state - global state.
 * textboxContent - text content inside the network and address textareas.
 */
export const P5CustomForwards = () => {
  // global state
  const { state, dispatch } = React.useContext(Store)

  // string to embed located at state.choices.embedString

  // local state for content in textboxes for new network address changes
  const [textboxContent, setTextboxContent] = React.useState({
    network: '',
    address: ''
  })

  // Check if the main action requires space in the embed string.
  // Return necessary string. No extra spaces.
  // e.g. returns: '', '!ca 234', '!abc '
  const getActionEmbedRequirements = (): string => {
    const chosenAction = state.choices.action
    let stringFromCommands = ''
    // Go through all action's suggestions and combine any commands found.
    // This is compatible with 0, 1, or multiple commands being used at same time.
    chosenAction.suggestions.forEach((thisSuggestion: any) => {
      if ('command' in thisSuggestion.info) {
        // command setting found,
        // so add its contents to string and add value in getter as command match
        stringFromCommands += thisSuggestion.info.command + ' '
        stringFromCommands += thisSuggestion.info.get.value + ' '
      }
    })

    // remove extra space from end ('' stays '')
    stringFromCommands = stringFromCommands.slice(0, -1)

    // console.log('after checking', chosenAction.suggestions)
    // console.log('getActionEmbedRequirements returned', stringFromCommands)
    return stringFromCommands
  }

  // set global state's string to embed from an object of planned changes
  const setPlannedChanges = (objForwards: Planned_Changes = {}) => {
    let forwardsString = ''
    Object.keys(objForwards).forEach(fwNetwork => {
      const forward = objForwards[fwNetwork]

      forwardsString += fwNetwork + ' ' + forward + ' '
    })
    // remove extra space from end ('' stays '')
    forwardsString = forwardsString.slice(0, -1)

    // to avoid useless rerenders, only change state
    // if it current state string doesn't match calculated string
    const needsChanging = forwardsString !== state.choices.embedString

    if (needsChanging) {
      changeChoicesBNSAction(state, dispatch, {
        embedString: forwardsString
      })
    }
  }

  // Object of planned changes derived from
  // global state embedString and action choice
  const getPlannedChanges = () => {
    // this is string that's going to be embedded
    const forwardsString = state.choices.embedString

    // get required by actions string as well
    const actionRequirementsString = getActionEmbedRequirements()

    // combine (later string values are given priority)
    const finalString =
      forwardsString +
      // if either are blank, no need to separate with space
      (actionRequirementsString === '' || forwardsString === '' ? '' : ' ') +
      actionRequirementsString

    // convert all changes to object so same networks overwrite themselves as keys.
    const changesObject = finalString.split(' ').reduce(
      (
        // add each planned change into plannedChangesSoFar
        plannedChangesSoFar: Planned_Changes,
        // from each word
        word: string,
        index: number,
        // out of this array of words
        words: Array<string>
      ): Planned_Changes => {
        // every second word is "forwarding address", word before it is "network"
        if (index % 2 === 1) {
          return { ...plannedChangesSoFar, [words[index - 1]]: word }
        } else {
          return plannedChangesSoFar
        }
      },
      {} // initial value for plannedChangesSoFar
    )

    return changesObject
  }

  // If embed string is empty (to minimize calculations per render), call setPlannedChanges to initialize it
  // since it doesn't update state unless it's necessary, no refresh is triggered each render
  if (state.choices.embedString === '') setPlannedChanges(getPlannedChanges())

  // Array of past {[network]:forwardingAddress} objects.
  // Display only active ones with latest higher.
  const pastForwards = findLatestForwards(
    getOwner(state)?.forwards || []
  ).reverse()

  // count # of bytes in string and buffers
  const bytesOfChanges =
    stringByteCount(state.choices.embedString) +
    state.choices.embedBuffers.reduce(
      (bytesTotal: number, eachBufferObject: any) =>
        // network + space + buffer
        bytesTotal +
        eachBufferObject.network.length +
        eachBufferObject.address.length +
        1,
      0
    )
  // count # of bytes left for storage
  const bytesLeft = BYTES_MAX - bytesOfChanges
  // if no more space
  const isSpaceFull = bytesLeft < 0

  /**
   * Render explanation of the change with submitted forwards network name.
   * Checks if it's a buffer version or simple string.
   */
  const explainForwards = (
    fwNetwork: string,
    {
      embededBuffer
    }: { embededBuffer: null | { network: string; address: Buffer } } = {
      embededBuffer: null
    }
  ) => {
    const value = !embededBuffer
      ? getPlannedChanges()[fwNetwork]
      : `${embededBuffer.address.length} bytes long`

    // display byte cost (including separator)
    const bytes = !embededBuffer
      ? stringByteCount(fwNetwork + ' ' + value)
      : embededBuffer.network.length + 1 + embededBuffer.address.length
    const thisByteCostEstimate = (
      <i>
        {' '}
        ({bytes}-{bytes + 1}B)
      </i>
    )

    // return explanation of embedded content
    const interpretation = () => {
      // if it was a command
      if (fwNetwork.startsWith('!')) {
        const cmd = interpretCommand(fwNetwork, value)
        return {
          content: (
            <>
              {cmd ? (
                <>
                  "{cmd.info}" user action. {cmd.getterName} is set to{' '}
                  <span>{cmd.value}</span>.
                </>
              ) : (
                'User action'
              )}
              {thisByteCostEstimate}
            </>
          ),
          allowRemoval: false
        }
      }

      // forwarding for stealth addresses
      if (embededBuffer && fwNetwork === '?') {
        // base58 is standard for xpub & thus stealth
        const stringApprox = bs58check.encode(embededBuffer.address)
        return {
          content: (
            <>
              Updating <span>stealth address</span> to an address
              <span>
                {' ' +
                  stringApprox.slice(0, 7) +
                  '...' +
                  stringApprox.slice(-7) +
                  ' '}
              </span>
              {thisByteCostEstimate}
            </>
          ),
          allowRemoval: true
        }
      }

      // regular forwarding: network's forwarding address was provided
      if (value !== '') {
        return {
          content: (
            <>
              Updating forwarding on <span>{' ' + fwNetwork + ' '}</span>
              network to an address of <span>{' ' + value + ' '}</span>
              {thisByteCostEstimate}
            </>
          ),
          allowRemoval: true
        }
      }

      // regular forwarding: if network's forwarding address was set blank
      if (value === '') {
        return {
          content: (
            <>
              Deleting previously set forwarding information for
              <span>{' ' + fwNetwork + ' '}</span> network
              {thisByteCostEstimate}
            </>
          ),
          allowRemoval: true
        }
      }

      return { content: '' }
    }

    // return a div that onclick fills in the contents of planned changes into textboxes
    return (
      <div
        className={styles.updateItem}
        key={fwNetwork}
        onClick={() => {
          // fill in the edit field with these values in case
          // (only if it's not a command or a buffer value)
          if (!fwNetwork.startsWith('!') && !embededBuffer)
            setTextboxContent({ network: fwNetwork, address: String(value) })
        }}
      >
        <div className={styles.updateInfo}>{interpretation().content}</div>
        {/* removal button. only render removal button if allowed */}
        {interpretation().allowRemoval && (
          <div
            className={[
              'btnCircle',
              styles.updateCancel,
              'addTooltipRight'
            ].join(' ')}
            onClick={e => {
              if (embededBuffer) {
                // remove this embedded buffer from array
                const newEmbedBuffers = state.choices.embedBuffers.filter(
                  (el: any) => embededBuffer.network !== el.network
                )
                // update front end state
                changeChoicesBNSAction(state, dispatch, {
                  embedBuffers: newEmbedBuffers
                })
              } else {
                // embedded string
                const newData = { ...getPlannedChanges() }
                delete newData[fwNetwork]
                setPlannedChanges(newData)
              }
              // block event from also clicking onto the updateItem
              e.stopPropagation()
            }}
          >
            <span>×</span>
            <aside>Remove from planned changes</aside>
          </div>
        )}
      </div>
    )
  }

  console.log('bytes to embed', bytesOfChanges)

  return (
    <div className={styles.wrapper}>
      <div className={styles.title}>Update forwarding information</div>

      <div className={styles.subtitle}>
        BNS action: {state.choices.action.info}
      </div>

      {/* ----------------------------- list of changes ---------------------------- */}

      <div className={styles.changes}>
        {/* bytes info */}
        {state.choices.embedString.length === 0 &&
        state.choices.embedBuffers.length === 0
          ? 'no forwarding updates'
          : 'planned forwarding updates'}
        {!isSpaceFull && (
          <div className={styles.bytesLeft}>{bytesLeft} Bytes left</div>
        )}
        {isSpaceFull && (
          <div className={styles.bytesOver}>
            Too much by {Math.abs(bytesLeft)} Bytes
          </div>
        )}

        {/* Show, explain, and allow editing and removing of each added key/value pair to embed */}
        {Object.keys(getPlannedChanges()).map((fwNetwork: any) =>
          explainForwards(fwNetwork)
        )}
        {state.choices.embedBuffers.map((eb: any) =>
          explainForwards(eb.network, { embededBuffer: eb })
        )}
      </div>

      {/* ----------------------------- text input area ---------------------------- */}

      <div className={styles.editor}>
        {textboxContent.network.length > 0 && (
          <div
            className={[styles.btnDelete, 'canPress'].join(' ')}
            onClick={() => {
              setPlannedChanges({
                ...getPlannedChanges(),
                [textboxContent.network]: ''
              })
              setTextboxContent({ network: '', address: '' })
            }}
          >
            delete old
          </div>
        )}
        <div className={styles.editorNetwork}>
          <aside>Network</aside>
          <textarea
            spellCheck={false}
            value={textboxContent.network}
            placeholder={'e.g. btc'}
            onChange={e => {
              const cleanText = sanitize(e.target.value, [
                'oneline',
                'no_spaces'
              ])
              setTextboxContent({ ...textboxContent, network: cleanText })
            }}
          ></textarea>
        </div>
        <div className={styles.editorAddress}>
          <aside>Forwarding address</aside>
          <textarea
            spellCheck={false}
            value={textboxContent.address}
            placeholder={'e.g. your btc address'}
            onChange={e => {
              const cleanText = sanitize(e.target.value, [
                'oneline',
                'no_spaces'
              ])
              setTextboxContent({ ...textboxContent, address: cleanText })
              console.log('forwarding sanitized:', '"' + cleanText + '"')
            }}
          ></textarea>
        </div>
        <div
          className={[
            'btnCircle',
            styles.btnAdd,
            'canPress',
            'addTooltip'
          ].join(' ')}
          onClick={() => {
            if (textboxContent.network !== '') {
              setPlannedChanges({
                ...getPlannedChanges(),
                [textboxContent.network]: textboxContent.address
              })
              setTextboxContent({ network: '', address: '' })
            }
          }}
        >
          <span>+</span>
          <aside>Add to planned changes</aside>
        </div>
      </div>

      {/* ---------------------------- current forwards ---------------------------- */}

      <div className={styles.pastList}>
        <Details description={'Current forwards (expand for info):'}>
          <p>
            Enter the forwarding addresses you want to use (e.g. long bitcoin
            address) and specify on which network that address should be used
            (e.g. btc) when someone wants to reach you after looking up your
            domain alias.
            <br />
            <br />
            Submit new updates by hitting [+] button. Remove updates by hitting
            [x] buttons.
            <br />
            <br />
            Below, the currently active forwarding addresses are shown, if any.
            <br />
            <br />
            Edit them by reusing the exact same network or remove by setting
            forwarding address to nothing or hitting [delete old] button under
            network name text.
          </p>
        </Details>
        {pastForwards.map((fw: any, i: number) => {
          return (
            <div
              className={styles.pastPair}
              key={i}
              onClick={() => {
                setTextboxContent({
                  network: decodeURIComponent(fw.network),
                  address: decodeURIComponent(fw.address)
                })
              }}
            >
              <div className={styles.pastNetwork}>
                {decodeURIComponent(fw.network) !== '?'
                  ? decodeURIComponent(fw.network)
                  : '? (stealth)'}
              </div>
              <div className={styles.pastAddress}>
                {decodeURIComponent(fw.address)}
              </div>
            </div>
          )
        })}
      </div>

      {/* --------------------------------- buttons -------------------------------- */}

      <div className={styles.buttonWrapper}>
        <RoundButton
          back='true'
          onClick={() => {
            changePageInfoAction(state, dispatch, 4)
          }}
        >
          Back
        </RoundButton>
        <RoundButton
          next='true'
          show={bytesOfChanges > BYTES_MAX ? 'false' : 'true'}
          onClick={() => {
            changePageInfoAction(state, dispatch, 6)
          }}
        >
          Ready
        </RoundButton>
        {/* if no stealth address, show button */}
        {/* (TODO) replace with constant for '?' type of network */}
        {/* (TODO) allow to increment stealth address hardened index by 1 */}
        {!state.choices.embedBuffers.some((fw: any) => fw.network === '?') &&
          !pastForwards.some(
            (fw: any) => decodeURIComponent(fw.network) === '?'
          ) && (
            <RoundButton
              colorbutton={'var(--colorHighlightDark)'}
              onClick={() => {
                console.log('adding stealth address')

                // need to add stealth address to embeds
                const newBufferAddress = {
                  network: '?',
                  address: getStealthAddress(
                    state.wallet.mnemonic,
                    state.network
                  )
                }
                changeChoicesBNSAction(state, dispatch, {
                  embedBuffers: [
                    ...state.choices.embedBuffers,
                    newBufferAddress
                  ]
                })
              }}
            >
              Add a stealth address
            </RoundButton>
          )}
      </div>
    </div>
  )
}
