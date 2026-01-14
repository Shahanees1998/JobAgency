import { createContext, useContext, useState } from 'react';

const GlobalController = () => {
  const [choirFilter, setChoirFilter] = useState<string>('');
  const [choirSearch, setChoirSearch] = useState<string>('');
  const [searchBar, setSearchBar] = useState<boolean>(false);
  const [songsFilter, setSongsFilter] = useState<any>('');
  const [chatsFilter, setChatsFilter] = useState<string>('');
  const [messagesFilter, setMessagesFilter] = useState<string>('');

  return {
    choirFilter,
    setChoirFilter,
    songsFilter,
    setSongsFilter,
    chatsFilter,
    setChatsFilter,
    messagesFilter,
    setMessagesFilter,
    choirSearch,
    setChoirSearch,
    searchBar,
    setSearchBar,
  };
};

const GlobalContext = createContext<ReturnType<typeof GlobalController>>({
  choirFilter: '',
  songsFilter: '',
  chatsFilter: '',
  messagesFilter: '',
  choirSearch: '',
  searchBar: false,
  setChoirFilter: () => [],
  setChoirSearch: () => [],
  setSearchBar: () => [],
  setSongsFilter: () => [],
  setChatsFilter: () => [],
  setMessagesFilter: () => [],
});

export const GlobalProvide = ({ children }: { children: React.ReactNode }) => (
  <GlobalContext.Provider value={GlobalController()}>
    {children}
  </GlobalContext.Provider>
);

export const useGlobal = () => useContext(GlobalContext);
