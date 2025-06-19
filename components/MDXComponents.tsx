import NextImage from 'next/image';

const MDXComponents = {
  Image: (props: any) => <NextImage {...props} />,
  // Add other custom components here if needed
};

export default MDXComponents;
